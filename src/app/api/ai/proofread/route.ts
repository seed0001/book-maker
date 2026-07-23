import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/openrouter";

const BodySchema = z.object({
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

  const chapter = await prisma.chapter.findUnique({
    where: { id: parsed.data.chapterId },
    include: { book: { select: { userId: true, kind: true } } },
  });
  if (!chapter || chapter.book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!chapter.content.trim()) {
    return NextResponse.json(
      { error: "This chapter is empty — nothing to proofread yet." },
      { status: 400 }
    );
  }

  const content = await complete(
    [
      {
        role: "system",
        content:
          "You are a meticulous copyeditor. Proofread the chapter text you are given: fix spelling, " +
          "grammar, punctuation, repeated words, and awkward phrasing. Preserve the author's voice, " +
          "style, meaning, and paragraph structure — do NOT rewrite creatively, condense, or expand. " +
          "Return ONLY the corrected chapter text with no preamble, commentary, or markdown.",
      },
      { role: "user", content: chapter.content.slice(0, 100_000) },
    ],
    { maxTokens: 8000 }
  );

  if (!content.trim()) {
    return NextResponse.json({ error: "Proofread failed" }, { status: 502 });
  }

  return NextResponse.json({ content });
}
