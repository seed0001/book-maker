"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password");
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
        <h1 className="mt-8 text-2xl font-semibold">Welcome back</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
            placeholder="Password"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-md bg-amber-400 py-2.5 font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-sm text-zinc-400">
          No account?{" "}
          <Link href="/signup" className="text-amber-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
