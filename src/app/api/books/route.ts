import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { starterChapters } from "@/lib/bookKinds";

const DEFAULT_SETTINGS = {
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 12,
  lineHeight: 1.6,
  pageSize: "6x9",
};

const CreateSchema = z.object({
  kind: z.string().max(40).optional(),
  title: z.string().min(1).max(200).optional(),
  premise: z.string().max(10_000).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const kind = parsed.data.kind ?? "novel";
  const book = await prisma.book.create({
    data: {
      userId: session.user.id,
      kind,
      title: parsed.data.title ?? "Untitled Book",
      premise: parsed.data.premise ?? "",
      settings: DEFAULT_SETTINGS,
      chapters: {
        create: starterChapters(kind).map((title, i) => ({ title, order: i })),
      },
    },
  });

  return NextResponse.json({ id: book.id }, { status: 201 });
}
