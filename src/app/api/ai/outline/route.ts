import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/openrouter";
import { bookContextBlock } from "@/lib/bookAI";

const BodySchema = z.object({
  bookId: z.string(),
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

  const book = await prisma.book.findUnique({
    where: { id: parsed.data.bookId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      sessions: { include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!book || book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const transcript = book.sessions
    .map(
      (s) =>
        `--- Thread: ${s.topic} ---\n` +
        s.messages
          .map((m) => `${m.role === "user" ? "AUTHOR" : "AI"}: ${m.content}`)
          .join("\n")
    )
    .join("\n\n")
    .slice(-50_000);

  if (!book.premise.trim() && !transcript.trim()) {
    return NextResponse.json(
      {
        error:
          "Nothing to outline from yet. Add a premise in Design or brainstorm in the Studio first.",
      },
      { status: 400 }
    );
  }

  const raw = await complete(
    [
      {
        role: "system",
        content:
          "You are a book architect. Based on the book context and development notes provided, produce a " +
          "chapter outline for the whole book. Respond with ONLY a JSON array of 6-14 strings — the chapter " +
          "titles in order. Titles should be evocative and specific to this book, not generic. No other text.",
      },
      {
        role: "user",
        content:
          bookContextBlock({
            title: book.title,
            kind: book.kind,
            premise: book.premise,
            chapterTitles: book.chapters.map((c) => c.title),
          }) + (transcript ? `\n\nDevelopment notes:\n${transcript}` : ""),
      },
    ],
    { maxTokens: 1500 }
  );

  let titles: string[];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    titles = z.array(z.string().min(1).max(200)).min(3).max(20).parse(
      JSON.parse(match ? match[0] : raw)
    );
  } catch {
    return NextResponse.json(
      { error: "The AI returned an unusable outline — try again." },
      { status: 502 }
    );
  }

  // Keep chapters that already have writing; replace empty ones with the new outline.
  const kept = book.chapters.filter((c) => c.content.trim());
  const keptTitles = new Set(kept.map((c) => c.title.toLowerCase()));
  const fresh = titles.filter((t) => !keptTitles.has(t.toLowerCase()));

  await prisma.$transaction([
    prisma.chapter.deleteMany({
      where: { bookId: book.id, content: "" },
    }),
    ...kept.map((c, i) =>
      prisma.chapter.update({ where: { id: c.id }, data: { order: i } })
    ),
    prisma.chapter.createMany({
      data: fresh.map((title, i) => ({
        bookId: book.id,
        title,
        order: kept.length + i,
      })),
    }),
  ]);

  const chapters = await prisma.chapter.findMany({
    where: { bookId: book.id },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true, content: true },
  });

  return NextResponse.json({ chapters });
}
