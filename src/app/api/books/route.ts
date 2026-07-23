import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STARTER_CHAPTERS = [
  "Childhood",
  "Family & Roots",
  "Coming of Age",
  "Career & Calling",
  "Love & Relationships",
  "Trials & Triumphs",
  "Lessons & Legacy",
];

const DEFAULT_SETTINGS = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 12,
  lineHeight: 1.6,
  pageSize: "6x9",
};

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const book = await prisma.book.create({
    data: {
      userId: session.user.id,
      settings: DEFAULT_SETTINGS,
      chapters: {
        create: STARTER_CHAPTERS.map((title, i) => ({ title, order: i })),
      },
    },
  });

  return NextResponse.json({ id: book.id }, { status: 201 });
}
