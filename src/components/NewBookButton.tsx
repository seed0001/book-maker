"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBookButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/books", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/books/${id}`);
    }
  }

  return (
    <button
      onClick={create}
      disabled={busy}
      className="rounded-md bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
    >
      {busy ? "Creating…" : "+ New book"}
    </button>
  );
}
