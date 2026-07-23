"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BOOK_KINDS } from "@/lib/bookKinds";

export default function NewBookButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("novel");
  const [title, setTitle] = useState("");
  const [premise, setPremise] = useState("");

  async function create() {
    setBusy(true);
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title: title.trim() || undefined,
        premise: premise.trim() || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/books/${id}`);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300"
      >
        + New book
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold">Start a new book</h2>

            <label className="mt-5 block">
              <span className="text-sm text-zinc-400">What kind of book?</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
              >
                {BOOK_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-sm text-zinc-400">
                Working title <span className="text-zinc-600">(optional)</span>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Book"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm text-zinc-400">
                What&apos;s it about?{" "}
                <span className="text-zinc-600">(optional — the AI uses this everywhere)</span>
              </span>
              <textarea
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                rows={3}
                placeholder="A one-paragraph premise, idea, or vibe…"
                className="mt-1 w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={busy}
                className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create book"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
