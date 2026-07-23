import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/openrouter";

const BodySchema = z.object({
  bookId: z.string(),
  chapterId: z.string(),
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

  const { bookId, chapterId } = parsed.data;
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      sessions: {
        include: { messages: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!book || book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // Prefer the interview session matching this chapter's title; fall back to all
  const matching = book.sessions.filter(
    (s) => s.topic.toLowerCase() === chapter.title.toLowerCase()
  );
  const sources = matching.length > 0 ? matching : book.sessions;
  const transcript = sources
    .flatMap((s) =>
      s.messages.map(
        (m) => `${m.role === "user" ? "SUBJECT" : "INTERVIEWER"}: ${m.content}`
      )
    )
    .join("\n");

  if (!transcript.trim()) {
    return NextResponse.json(
      { error: "No interview material yet. Do some interviewing first!" },
      { status: 400 }
    );
  }

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a gifted memoir ghostwriter. Using ONLY the interview transcript provided, " +
          "write a chapter of an autobiography in the first person, in the subject's voice. " +
          "Preserve their facts, names, and phrasings; never invent events. Write flowing, " +
          "vivid, warm prose in plain paragraphs (no markdown headers). Aim for 500-1200 words " +
          "depending on how much material is available.",
      },
      {
        role: "user",
        content: `Chapter title: "${chapter.title}"\nBook title: "${book.title}"\n\nInterview transcript:\n${transcript}`,
      },
    ],
    { maxTokens: 4000 }
  );

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { content },
  });

  return NextResponse.json({ content });
}
