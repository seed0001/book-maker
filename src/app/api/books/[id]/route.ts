import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(300).nullable().optional(),
  premise: z.string().max(10_000).optional(),
  coverImageUrl: z.string().max(500).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book || book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { title, subtitle, premise, coverImageUrl, settings } = parsed.data;
  const updated = await prisma.book.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(subtitle !== undefined && { subtitle }),
      ...(premise !== undefined && { premise }),
      ...(coverImageUrl !== undefined && { coverImageUrl }),
      ...(settings !== undefined && { settings: settings as object }),
    },
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book || book.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.book.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
