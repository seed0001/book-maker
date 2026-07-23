import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/openrouter";
import { bookContextBlock } from "@/lib/bookAI";

const BodySchema = z.object({
  bookId: z.string(),
});

const MAX_PER_CHAPTER = 12_000;

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

  const book = await prisma.book.findUnique({
    where: { id: parsed.data.bookId },
    include: { chapters: { orderBy: { order: "asc" } } },
  });
  if (!book || book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const written = book.chapters.filter((c) => c.content.trim());
  if (written.length === 0) {
    return NextResponse.json(
      { error: "No written chapters yet — draft something first." },
      { status: 400 }
    );
  }

  const manuscript = written
    .map((c) => `=== ${c.title} ===\n${c.content.slice(0, MAX_PER_CHAPTER)}`)
    .join("\n\n");

  const report = await complete(
    [
      {
        role: "system",
        content:
          "You are a sharp developmental editor reviewing a book manuscript for coherence. Analyze it and " +
          "produce a clear, encouraging but honest report with these sections:\n" +
          "1. OVERALL — one paragraph on how the book hangs together.\n" +
          "2. CONTINUITY ISSUES — specific inconsistencies in names, facts, timeline, or details (cite the chapters).\n" +
          "3. STRUCTURE & PACING — what drags, what's rushed, what's missing or out of order.\n" +
          "4. VOICE & TONE — where the voice wobbles or shifts.\n" +
          "5. TOP 5 FIXES — the highest-impact changes, most important first.\n" +
          "Be specific and cite chapter titles. Plain text, no markdown symbols.",
      },
      {
        role: "user",
        content:
          bookContextBlock({
            title: book.title,
            kind: book.kind,
            premise: book.premise,
            chapterTitles: book.chapters.map((c) => c.title),
          }) +
          "\n\nMANUSCRIPT:\n\n" +
          manuscript,
      },
    ],
    { maxTokens: 4000 }
  );

  return NextResponse.json({ report });
}
