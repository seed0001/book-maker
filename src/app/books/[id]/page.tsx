import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BookWorkspace from "@/components/BookWorkspace";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      chapters: { orderBy: { order: "asc" } },
      sessions: {
        include: { messages: { orderBy: { createdAt: "asc" } } },
      },
    },
  });

  if (!book || book.userId !== session.user.id) notFound();

  return (
    <BookWorkspace
      book={{
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        coverImageUrl: book.coverImageUrl,
        settings: (book.settings ?? {}) as Record<string, unknown>,
        chapters: book.chapters.map((c) => ({
          id: c.id,
          title: c.title,
          order: c.order,
          content: c.content,
        })),
        sessions: book.sessions.map((s) => ({
          topic: s.topic,
          messages: s.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        })),
      }}
    />
  );
}
