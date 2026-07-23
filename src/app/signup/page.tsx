"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong");
      setBusy(false);
      return;
    }

    const signed = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (signed?.error) {
      router.push("/signin");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-lg font-semibold">
          Book<span className="text-amber-400">Maker</span>
        </Link>
        <h1 className="mt-8 text-2xl font-semibold">Start your story</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            name="name"
            type="text"
            placeholder="Your name (optional)"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-md bg-amber-400 py-2.5 font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/signin" className="text-amber-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
