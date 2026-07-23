import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewBookButton from "@/components/NewBookButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const books = await prisma.book.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { chapters: true, sessions: true } } },
  });

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Book<span className="text-amber-400">Maker</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">
            {session.user.name ?? session.user.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-zinc-400 hover:text-white">Sign out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your books</h1>
          <NewBookButton />
        </div>

        {books.length === 0 ? (
          <div className="mt-16 rounded-xl border border-dashed border-zinc-800 p-16 text-center">
            <p className="text-lg text-zinc-300">No books yet.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Start your autobiography — the AI interviewer is ready when you
              are.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-amber-400/50"
              >
                <div className="font-serif text-lg leading-snug group-hover:text-amber-300">
                  {book.title}
                </div>
                {book.subtitle && (
                  <div className="mt-1 text-sm text-zinc-400">
                    {book.subtitle}
                  </div>
                )}
                <div className="mt-4 text-xs text-zinc-500">
                  {book._count.chapters} chapters · {book._count.sessions}{" "}
                  interview sessions
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  Updated {book.updatedAt.toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
