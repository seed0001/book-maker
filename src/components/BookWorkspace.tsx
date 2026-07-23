"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { kindLabel, suggestedThreads } from "@/lib/bookKinds";

type Chapter = { id: string; title: string; order: number; content: string };
type Message = { role: "user" | "assistant"; content: string };
type SessionData = { topic: string; messages: Message[] };

type BookData = {
  id: string;
  title: string;
  subtitle: string | null;
  kind: string;
  premise: string;
  coverImageUrl: string | null;
  settings: Record<string, unknown>;
  chapters: Chapter[];
  sessions: SessionData[];
};

const FONTS = [
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Palatino", value: "'Palatino Linotype', Palatino, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Garamond", value: "Garamond, 'EB Garamond', serif" },
  { label: "Book Antiqua", value: "'Book Antiqua', Palatino, serif" },
];

const PAGE_SIZES: Record<string, { w: number; h: number; label: string }> = {
  "5x8": { w: 5, h: 8, label: '5" × 8" (Digest)' },
  "6x9": { w: 6, h: 9, label: '6" × 9" (Trade)' },
  A5: { w: 5.83, h: 8.27, label: "A5" },
  letter: { w: 8.5, h: 11, label: 'Letter (8.5" × 11")' },
};

const TABS = ["Studio", "Write", "Review", "Design", "Preview"] as const;
type Tab = (typeof TABS)[number];

export default function BookWorkspace({ book }: { book: BookData }) {
  const [tab, setTab] = useState<Tab>("Studio");
  const [title, setTitle] = useState(book.title);
  const [subtitle, setSubtitle] = useState(book.subtitle ?? "");
  const [premise, setPremise] = useState(book.premise);
  const [coverUrl, setCoverUrl] = useState(book.coverImageUrl);
  const [chapters, setChapters] = useState(book.chapters);
  const [settings, setSettings] = useState({
    fontFamily: (book.settings.fontFamily as string) ?? FONTS[0].value,
    fontSize: Number(book.settings.fontSize ?? 12),
    lineHeight: Number(book.settings.lineHeight ?? 1.6),
    pageSize: (book.settings.pageSize as string) ?? "6x9",
  });

  return (
    <div className="flex min-h-screen w-full flex-col bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-900 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">
            ← My books
          </Link>
          <div>
            <span className="font-serif text-lg">{title}</span>
            <span className="ml-3 rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
              {kindLabel(book.kind)}
            </span>
          </div>
        </div>
        <nav className="flex gap-1 rounded-lg bg-zinc-900 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm transition ${
                tab === t
                  ? "bg-amber-400 font-medium text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === "Studio" && (
          <StudioTab bookId={book.id} kind={book.kind} sessions={book.sessions} />
        )}
        {tab === "Write" && (
          <WriteTab bookId={book.id} chapters={chapters} setChapters={setChapters} />
        )}
        {tab === "Review" && <ReviewTab bookId={book.id} />}
        {tab === "Design" && (
          <DesignTab
            bookId={book.id}
            title={title}
            setTitle={setTitle}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            premise={premise}
            setPremise={setPremise}
            coverUrl={coverUrl}
            setCoverUrl={setCoverUrl}
            settings={settings}
            setSettings={setSettings}
          />
        )}
        {tab === "Preview" && (
          <PreviewTab
            title={title}
            subtitle={subtitle}
            coverUrl={coverUrl}
            chapters={chapters}
            settings={settings}
          />
        )}
      </main>
    </div>
  );
}

/* ------------------------------ Studio tab ------------------------------ */

function StudioTab({
  bookId,
  kind,
  sessions,
}: {
  bookId: string;
  kind: string;
  sessions: SessionData[];
}) {
  const defaultThreads = useMemo(() => {
    const existing = sessions.map((s) => s.topic);
    const suggested = suggestedThreads(kind).filter((t) => !existing.includes(t));
    return [...existing, ...suggested];
  }, [sessions, kind]);

  const [threads, setThreads] = useState<string[]>(defaultThreads);
  const [topic, setTopic] = useState(threads[0] ?? "Ideas");
  const [newThread, setNewThread] = useState("");
  const [histories, setHistories] = useState<Record<string, Message[]>>(() =>
    Object.fromEntries(sessions.map((s) => [s.topic, s.messages]))
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = histories[topic] ?? [];

  function addThread() {
    const name = newThread.trim();
    if (!name || threads.includes(name)) return;
    setThreads((t) => [...t, name]);
    setTopic(name);
    setNewThread("");
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    const next: Message[] = [...messages, { role: "user", content: text }];
    setHistories((h) => ({ ...h, [topic]: next }));
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, topic, messages: next }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "The AI is unavailable");
      }
      setHistories((h) => ({
        ...h,
        [topic]: [...next, { role: "assistant", content: "" }],
      }));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const current = acc;
        setHistories((h) => ({
          ...h,
          [topic]: [...next, { role: "assistant", content: current }],
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 py-6">
      <div className="flex flex-wrap items-center gap-2">
        {threads.map((t) => (
          <button
            key={t}
            onClick={() => setTopic(t)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              topic === t
                ? "border-amber-400 bg-amber-400/10 text-amber-300"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            {t}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={newThread}
            onChange={(e) => setNewThread(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addThread()}
            placeholder="+ new thread"
            className="w-28 rounded-full border border-zinc-800 bg-transparent px-3 py-1 text-xs outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          />
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-zinc-900 bg-zinc-900/30 p-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">
            This is your development studio. Brainstorm{" "}
            <span className="text-zinc-300">{topic}</span> with your AI
            co-writer — storylines, characters, structure, anything. It all
            becomes source material for drafting chapters.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === "user"
                ? "ml-auto bg-amber-400/90 text-zinc-950"
                : "bg-zinc-800 text-zinc-100"
            }`}
          >
            {m.content || "…"}
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Toss out an idea, a scene, a question…"
          className="flex-1 resize-none rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="rounded-md bg-amber-400 px-5 text-sm font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
        >
          {streaming ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Write tab ------------------------------ */

function WriteTab({
  bookId,
  chapters,
  setChapters,
}: {
  bookId: string;
  chapters: Chapter[];
  setChapters: React.Dispatch<React.SetStateAction<Chapter[]>>;
}) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [proofing, setProofing] = useState(false);
  const [outlining, setOutlining] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previousContent, setPreviousContent] = useState<string | null>(null);

  const active = chapters.find((c) => c.id === activeId) ?? null;

  function updateContent(content: string) {
    setChapters((cs) =>
      cs.map((c) => (c.id === activeId ? { ...c, content } : c))
    );
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    setNotice(null);
    const res = await fetch(`/api/chapters/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: active.content }),
    });
    setSaving(false);
    setNotice(res.ok ? "Saved" : "Save failed");
  }

  async function draftWithAI() {
    if (!active) return;
    setDrafting(true);
    setNotice(null);
    setPreviousContent(active.content);
    const res = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, chapterId: active.id }),
    });
    const data = await res.json().catch(() => null);
    setDrafting(false);
    if (res.ok && data?.content) {
      updateContent(data.content);
      setNotice("Draft generated (saved)");
    } else {
      setPreviousContent(null);
      setNotice(data?.error ?? "Drafting failed");
    }
  }

  async function proofread() {
    if (!active) return;
    setProofing(true);
    setNotice(null);
    setPreviousContent(active.content);
    const res = await fetch("/api/ai/proofread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: active.id }),
    });
    const data = await res.json().catch(() => null);
    setProofing(false);
    if (res.ok && data?.content) {
      updateContent(data.content);
      setNotice("Proofread applied — review, then Save");
    } else {
      setPreviousContent(null);
      setNotice(data?.error ?? "Proofread failed");
    }
  }

  function revert() {
    if (previousContent === null) return;
    updateContent(previousContent);
    setPreviousContent(null);
    setNotice("Reverted");
  }

  async function generateOutline() {
    setOutlining(true);
    setNotice(null);
    const res = await fetch("/api/ai/outline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    const data = await res.json().catch(() => null);
    setOutlining(false);
    if (res.ok && data?.chapters) {
      setChapters(data.chapters);
      setActiveId(data.chapters[0]?.id ?? null);
      setNotice("Outline generated");
    } else {
      setNotice(data?.error ?? "Outline failed");
    }
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-zinc-900 p-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Chapters
          </h2>
        </div>
        <ul className="mt-2 flex-1 space-y-1">
          {chapters.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  setActiveId(c.id);
                  setPreviousContent(null);
                }}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  c.id === activeId
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                <span className="mr-2 text-zinc-600">{c.order + 1}.</span>
                {c.title}
                {c.content && <span className="ml-2 text-amber-400">•</span>}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={generateOutline}
          disabled={outlining}
          className="mt-3 rounded-md border border-amber-400/50 px-3 py-2 text-xs text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
        >
          {outlining ? "Outlining…" : "✨ Generate outline from ideas"}
        </button>
        <p className="mt-2 px-1 text-[10px] leading-snug text-zinc-600">
          Replaces empty chapters with an AI outline built from your premise and
          Studio threads. Written chapters are kept.
        </p>
      </aside>

      <section className="flex flex-1 flex-col p-6">
        {active ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-xl">{active.title}</h2>
              <div className="flex flex-wrap items-center gap-3">
                {notice && <span className="text-xs text-zinc-400">{notice}</span>}
                {previousContent !== null && (
                  <button
                    onClick={revert}
                    className="text-xs text-zinc-400 underline hover:text-white"
                  >
                    Revert
                  </button>
                )}
                <button
                  onClick={draftWithAI}
                  disabled={drafting || proofing}
                  className="rounded-md border border-amber-400/50 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
                >
                  {drafting ? "Drafting…" : "✨ Draft with AI"}
                </button>
                <button
                  onClick={proofread}
                  disabled={proofing || drafting || !active.content.trim()}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-50"
                >
                  {proofing ? "Proofreading…" : "Proofread"}
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-md bg-amber-400 px-4 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            <textarea
              value={active.content}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="Write this chapter yourself, or let the AI draft it from your premise and Studio notes…"
              className="mt-4 flex-1 resize-none rounded-xl border border-zinc-900 bg-zinc-900/30 p-5 font-serif text-[15px] leading-relaxed outline-none focus:border-zinc-700"
            />
          </>
        ) : (
          <p className="text-zinc-500">No chapter selected.</p>
        )}
      </section>
    </div>
  );
}

/* ------------------------------ Review tab ------------------------------ */

function ReviewTab({ bookId }: { bookId: string }) {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    const res = await fetch("/api/ai/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    const data = await res.json().catch(() => null);
    setRunning(false);
    if (res.ok && data?.report) {
      setReport(data.report);
    } else {
      setError(data?.error ?? "Review failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Coherence review</h2>
          <p className="mt-1 text-sm text-zinc-400">
            A developmental-editor pass over your whole manuscript: continuity,
            structure, pacing, and voice.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="rounded-md bg-amber-400 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
        >
          {running ? "Reviewing…" : report ? "Run again" : "✨ Review my book"}
        </button>
      </div>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {running && (
        <p className="mt-10 text-center text-sm text-zinc-500">
          Reading every chapter… this can take a minute for longer books.
        </p>
      )}

      {report && !running && (
        <div className="mt-8 whitespace-pre-wrap rounded-xl border border-zinc-900 bg-zinc-900/30 p-6 text-sm leading-relaxed text-zinc-200">
          {report}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Design tab ------------------------------ */

type Settings = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  pageSize: string;
};

function DesignTab({
  bookId,
  title,
  setTitle,
  subtitle,
  setSubtitle,
  premise,
  setPremise,
  coverUrl,
  setCoverUrl,
  settings,
  setSettings,
}: {
  bookId: string;
  title: string;
  setTitle: (v: string) => void;
  subtitle: string;
  setSubtitle: (v: string) => void;
  premise: string;
  setPremise: (v: string) => void;
  coverUrl: string | null;
  setCoverUrl: (v: string | null) => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function uploadCover(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("bookId", bookId);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.url) {
      setCoverUrl(data.url);
      await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImageUrl: data.url }),
      });
      setNotice("Cover uploaded");
    } else {
      setNotice(data?.error ?? "Upload failed");
    }
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    const res = await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subtitle: subtitle || null,
        premise,
        settings,
      }),
    });
    setSaving(false);
    setNotice(res.ok ? "Saved" : "Save failed");
  }

  return (
    <div className="mx-auto max-w-2xl overflow-y-auto px-6 py-8">
      <h2 className="text-xl font-semibold">Book setup & design</h2>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm text-zinc-400">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-400">Subtitle</span>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="An optional subtitle"
            className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-400">
            Premise — what this book is about{" "}
            <span className="text-zinc-600">(the AI uses this everywhere)</span>
          </span>
          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            rows={4}
            placeholder="The elevator pitch, themes, main characters, setting, angle…"
            className="mt-1 w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-zinc-400">Body font</span>
            <select
              value={settings.fontFamily}
              onChange={(e) =>
                setSettings((s) => ({ ...s, fontFamily: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
            >
              {FONTS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-zinc-400">Page size</span>
            <select
              value={settings.pageSize}
              onChange={(e) =>
                setSettings((s) => ({ ...s, pageSize: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
            >
              {Object.entries(PAGE_SIZES).map(([key, ps]) => (
                <option key={key} value={key}>
                  {ps.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-zinc-400">
              Font size: {settings.fontSize}pt
            </span>
            <input
              type="range"
              min={9}
              max={16}
              value={settings.fontSize}
              onChange={(e) =>
                setSettings((s) => ({ ...s, fontSize: Number(e.target.value) }))
              }
              className="mt-2 w-full accent-amber-400"
            />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-400">
              Line spacing: {settings.lineHeight.toFixed(1)}
            </span>
            <input
              type="range"
              min={1.2}
              max={2.2}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  lineHeight: Number(e.target.value),
                }))
              }
              className="mt-2 w-full accent-amber-400"
            />
          </label>
        </div>

        <div>
          <span className="text-sm text-zinc-400">Cover art</span>
          <div className="mt-2 flex items-center gap-4">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt="Book cover"
                className="h-32 w-24 rounded-md border border-zinc-800 object-cover"
              />
            ) : (
              <div className="flex h-32 w-24 items-center justify-center rounded-md border border-dashed border-zinc-800 text-xs text-zinc-600">
                No cover
              </div>
            )}
            <label className="cursor-pointer rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500">
              Upload image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCover(f);
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-amber-400 px-5 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {notice && <span className="text-sm text-zinc-400">{notice}</span>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Preview tab ------------------------------ */

function PreviewTab({
  title,
  subtitle,
  coverUrl,
  chapters,
  settings,
}: {
  title: string;
  subtitle: string;
  coverUrl: string | null;
  chapters: Chapter[];
  settings: Settings;
}) {
  const size = PAGE_SIZES[settings.pageSize] ?? PAGE_SIZES["6x9"];
  const pageWidth = 440;
  const pageHeight = Math.round((pageWidth * size.h) / size.w);
  const written = useMemo(
    () => chapters.filter((c) => c.content.trim()),
    [chapters]
  );

  const pageStyle: React.CSSProperties = {
    width: pageWidth,
    height: pageHeight,
    fontFamily: settings.fontFamily,
    fontSize: `${settings.fontSize + 2}px`,
    lineHeight: settings.lineHeight,
  };

  return (
    <div className="h-full overflow-y-auto bg-zinc-900/40 py-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-6">
        {/* Cover page */}
        <div
          style={{ width: pageWidth, height: pageHeight }}
          className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-sm bg-zinc-800 text-center shadow-2xl"
        >
          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
          )}
          <div className="relative px-10">
            <h1
              className="font-serif text-3xl leading-tight text-white"
              style={{ fontFamily: settings.fontFamily }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 text-sm italic text-zinc-200">{subtitle}</p>
            )}
          </div>
        </div>

        {written.length === 0 ? (
          <p className="pb-10 text-sm text-zinc-500">
            No written chapters yet — draft some in the Write tab and they will
            appear here as book pages.
          </p>
        ) : (
          written.map((c) => (
            <div
              key={c.id}
              style={pageStyle}
              className="shrink-0 overflow-y-auto rounded-sm bg-[#faf6ee] px-12 py-12 text-zinc-900 shadow-2xl"
            >
              <h2 className="mb-6 text-center text-xl">{c.title}</h2>
              {c.content.split(/\n\n+/).map((p, i) => (
                <p key={i} className="mb-4 text-justify indent-6">
                  {p}
                </p>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
