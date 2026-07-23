import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/openrouter";
import { bookContextBlock, draftSystemPrompt } from "@/lib/bookAI";

const BodySchema = z.object({
  bookId: z.string(),
  chapterId: z.string(),
});

const MAX_TRANSCRIPT = 60_000;
const MAX_CHAPTER_EXCERPT = 2_000;

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
      sessions: { include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!book || book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // Development notes: prefer the thread matching this chapter's title, else all threads
  const matching = book.sessions.filter(
    (s) => s.topic.toLowerCase() === chapter.title.toLowerCase()
  );
  const sources = matching.length > 0 ? matching : book.sessions;
  const transcript = sources
    .map(
      (s) =>
        `--- Thread: ${s.topic} ---\n` +
        s.messages
          .map((m) => `${m.role === "user" ? "AUTHOR" : "AI"}: ${m.content}`)
          .join("\n")
    )
    .join("\n\n")
    .slice(-MAX_TRANSCRIPT);

  if (!transcript.trim() && !book.premise.trim()) {
    return NextResponse.json(
      {
        error:
          "No source material yet. Add a premise in Design, or develop ideas in the Studio first.",
      },
      { status: 400 }
    );
  }

  // Excerpts of already-written chapters, for continuity
  const written = book.chapters
    .filter((c) => c.id !== chapterId && c.content.trim())
    .map(
      (c) =>
        `--- ${c.title} (excerpt) ---\n${c.content.slice(0, MAX_CHAPTER_EXCERPT)}`
    )
    .join("\n\n");

  const context = bookContextBlock({
    title: book.title,
    kind: book.kind,
    premise: book.premise,
    chapterTitles: book.chapters.map((c) => c.title),
  });

  const content = await complete(
    [
      { role: "system", content: draftSystemPrompt(book.kind) },
      {
        role: "user",
        content:
          `${context}\n\nChapter to draft: "${chapter.title}"` +
          (chapter.content.trim()
            ? `\n\nExisting draft of this chapter (improve/rewrite it):\n${chapter.content.slice(0, 8000)}`
            : "") +
          (written ? `\n\nOther written chapters:\n${written}` : "") +
          (transcript ? `\n\nDevelopment notes and transcripts:\n${transcript}` : ""),
      },
    ],
    { maxTokens: 6000 }
  );

  await prisma.chapter.update({ where: { id: chapterId }, data: { content } });

  return NextResponse.json({ content });
}
