import Link from "next/link";
import { auth } from "@/lib/auth";

const FEATURES = [
  {
    title: "Any book you can imagine",
    body: "Novels, memoirs, non-fiction, children's books, poetry — each with an AI co-writer that adapts to the craft of that form.",
  },
  {
    title: "A studio for your ideas",
    body: "Brainstorm storylines, characters, and structure in threaded AI sessions. For memoirs, the AI becomes your biographer and interviews you about your life.",
  },
  {
    title: "AI in every step",
    body: "Generate a chapter outline from your premise, draft chapters from your notes, proofread your prose, and run a whole-book coherence review from a developmental editor's eye.",
  },
  {
    title: "A real book designer",
    body: "Fonts, page sizes, cover art, page-by-page preview — and coming soon, full-cast audiobook narration with a different AI voice for every character.",
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
            Every book you&apos;ve ever wanted to write.{" "}
            <span className="text-amber-400">Written.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            BookMaker pairs you with an AI co-writer for the whole journey —
            brainstorming storylines, drafting chapters, keeping the story
            coherent, proofreading every line — then designs it into a real
            book, cover to cover.
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
        BookMaker — everyone has a book in them.
      </footer>
    </div>
  );
}
