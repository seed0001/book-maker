import Link from "next/link";
import { auth } from "@/lib/auth";

const FEATURES = [
  {
    title: "Guided AI interviews",
    body: "A thoughtful AI biographer interviews you about every era of your life — childhood, family, career, love, lessons — one question at a time.",
  },
  {
    title: "From memories to chapters",
    body: "Your interview answers become beautifully written first-person chapters, drafted by AI in your own voice and fully editable by you.",
  },
  {
    title: "A real book designer",
    body: "Choose fonts, page sizes, and layouts. Preview your autobiography page by page, exactly as it would print.",
  },
  {
    title: "Your photos, your cover",
    body: "Upload personal photos and cover art to make the book unmistakably yours.",
  },
];

export default async function Home() {
  const session = await auth();
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">
          Book<span className="text-amber-400">Maker</span>
        </span>
        <nav className="flex items-center gap-4 text-sm">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-amber-400 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-300"
            >
              My books
            </Link>
          ) : (
            <>
              <Link href="/signin" className="text-zinc-300 hover:text-white">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-amber-400 px-4 py-2 font-medium text-zinc-950 hover:bg-amber-300"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-24 text-center">
          <h1 className="mx-auto max-w-3xl font-serif text-5xl leading-tight tracking-tight sm:text-6xl">
            Your life. <span className="text-amber-400">Beautifully told.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            BookMaker turns your memories into a finished autobiography. Sit for
            an AI-guided interview about your whole life, then watch it become a
            real book — designed, typeset, and yours to keep.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href={session ? "/dashboard" : "/signup"}
              className="rounded-md bg-amber-400 px-6 py-3 font-medium text-zinc-950 hover:bg-amber-300"
            >
              Start your story
            </Link>
          </div>
        </section>

        <section className="grid gap-6 pb-24 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <h2 className="text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {f.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-zinc-900 py-8 text-center text-sm text-zinc-500">
        BookMaker — every life deserves a book.
      </footer>
    </div>
  );
}
