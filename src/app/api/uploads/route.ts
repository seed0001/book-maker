import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function uploadDir() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const bookId = form?.get("bookId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Max file size is 10 MB" }, { status: 400 });
  }

  if (typeof bookId === "string" && bookId) {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.userId !== session.user.id) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
  }

  const ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" }[file.type]!;
  const name = crypto.randomBytes(16).toString("hex") + ext;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  const asset = await prisma.asset.create({
    data: {
      userId: session.user.id,
      bookId: typeof bookId === "string" && bookId ? bookId : null,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      path: name,
    },
  });

  return NextResponse.json(
    { id: asset.id, url: `/api/assets/${asset.id}` },
    { status: 201 }
  );
}
