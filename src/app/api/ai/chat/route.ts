import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamChat, type ChatMessage } from "@/lib/openrouter";
import { chatSystemPrompt } from "@/lib/bookAI";

const BodySchema = z.object({
  bookId: z.string(),
  topic: z.string().min(1).max(100),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(20_000),
      })
    )
    .min(1)
    .max(200),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { bookId, topic, messages } = parsed.data;
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { chapters: { orderBy: { order: "asc" }, select: { title: true } } },
  });
  if (!book || book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const thread = await prisma.interviewSession.upsert({
    where: { bookId_topic: { bookId, topic } },
    update: {},
    create: { bookId, topic },
  });

  // Persist the newest user message
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    await prisma.interviewMessage.create({
      data: { sessionId: thread.id, role: "user", content: lastUser.content },
    });
  }

  const chatMessages: ChatMessage[] = [
    {
      role: "system",
      content: chatSystemPrompt(
        {
          title: book.title,
          kind: book.kind,
          premise: book.premise,
          chapterTitles: book.chapters.map((c) => c.title),
        },
        topic
      ),
    },
    ...messages,
  ];

  try {
    const stream = await streamChat(chatMessages, {
      onFinish: async (text) => {
        if (text.trim()) {
          await prisma.interviewMessage.create({
            data: { sessionId: thread.id, role: "assistant", content: text },
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Studio chat error:", err);
    return NextResponse.json(
      { error: "The AI is unavailable right now. Check OPENROUTER_API_KEY." },
      { status: 502 }
    );
  }
}
