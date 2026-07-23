import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamChat, type ChatMessage } from "@/lib/openrouter";

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

function systemPrompt(topic: string) {
  return [
    "You are a warm, skilled biographer conducting a life-story interview for an autobiography.",
    `The current interview topic is: "${topic}".`,
    "Ask exactly one thoughtful question at a time. Follow up on interesting details —",
    "names, places, sensory memories, emotions, turning points. Draw out specifics that",
    "will make vivid memoir material. Be encouraging and personal, never clinical.",
    "Keep your responses short (a sentence or two of warm reaction, then the next question).",
    "If the subject seems finished with an area, gently move to an unexplored corner of the topic.",
  ].join(" ");
}

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
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book || book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const interviewSession = await prisma.interviewSession.upsert({
    where: { bookId_topic: { bookId, topic } },
    update: {},
    create: { bookId, topic },
  });

  // Persist the newest user message
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    await prisma.interviewMessage.create({
      data: {
        sessionId: interviewSession.id,
        role: "user",
        content: lastUser.content,
      },
    });
  }

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt(topic) },
    ...messages,
  ];

  try {
    const stream = await streamChat(chatMessages, {
      onFinish: async (text) => {
        if (text.trim()) {
          await prisma.interviewMessage.create({
            data: {
              sessionId: interviewSession.id,
              role: "assistant",
              content: text,
            },
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
    console.error("Interview AI error:", err);
    return NextResponse.json(
      { error: "The AI interviewer is unavailable right now. Check OPENROUTER_API_KEY." },
      { status: 502 }
    );
  }
}
