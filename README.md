# BookMaker

**Everyone has a book in them.** BookMaker is a web platform for writing *any* book — novel, memoir, non-fiction, children's book, poetry collection — with an AI co-writer assisting every step: brainstorming storylines, generating outlines, drafting chapters, keeping the whole thing coherent, and proofreading every line. Then it designs the result into a real book: fonts, page sizes, page-view preview, cover art, and your own photos.

## How it works

1. **Sign up** and start a book — pick its type and give the AI a premise. Memoirs start with life-area chapters; everything else starts with a blank three-chapter skeleton you can outline with AI.
2. **Studio** — threaded brainstorming sessions with an AI that adapts to your book's craft: plot and characters for fiction, thesis and structure for non-fiction, a warm biographer's interview for memoirs. Create threads for anything (world-building, research, a tricky scene). Everything is saved as source material.
3. **Write** — *Generate outline* turns your premise + Studio threads into a chapter structure. *Draft with AI* ghostwrites any chapter from your notes, staying consistent with what's already written. *Proofread* runs a copyedit pass that preserves your voice (with one-click revert). Or just write it yourself.
4. **Review** — a developmental-editor pass over the whole manuscript: continuity issues, structure and pacing, voice wobbles, and the top 5 highest-impact fixes.
5. **Design & Preview** — title, cover art, body font, font size, line spacing, page size (5×8, 6×9, A5, Letter), and a page-by-page preview of the finished book.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | One codebase for UI + API, first-class Railway support |
| Database | **PostgreSQL + Prisma 6** | Railway one-click Postgres; typed schema |
| Auth | **Auth.js (NextAuth v5)** | Email/password credentials, JWT sessions |
| AI | **OpenRouter** (direct REST, streaming) | Any flagship model via one API; default `anthropic/claude-sonnet-4.5`, swappable with `OPENROUTER_MODEL` |
| Styling | **Tailwind CSS 4** | Fast iteration on the editor/preview UI |
| Uploads | Local disk / **Railway volume** | Simple now; swap for S3/R2 later |
| Hosting | **Railway** | Deploys from this GitHub repo |

## AI surface

All AI flows go through [`src/lib/openrouter.ts`](src/lib/openrouter.ts) (streaming + one-shot) with per-book-kind prompts in [`src/lib/bookAI.ts`](src/lib/bookAI.ts):

- `POST /api/ai/chat` — streaming Studio chat, persisted per thread
- `POST /api/ai/outline` — chapter outline from premise + Studio notes (keeps written chapters)
- `POST /api/ai/draft` — ghostwrite a chapter from premise, notes, and existing chapters
- `POST /api/ai/proofread` — voice-preserving copyedit of a chapter
- `POST /api/ai/review` — whole-book coherence report

## Data model

`User` → `Book` (kind, premise, title, cover, design `settings` JSON) → `Chapter` (ordered prose) and `InterviewSession`/`InterviewMessage` (Studio threads). `Asset` records uploaded images stored on disk/volume.

## Local development

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, OPENROUTER_API_KEY
npx prisma db push          # create tables
npm run dev
```

## Deploying to Railway

1. Create a Railway project → **Deploy from GitHub repo** → pick `seed0001/book-maker`.
2. Add a **PostgreSQL** service. Reference its URL in the app service's variables: `DATABASE_URL = ${{Postgres.DATABASE_URL}}`.
3. Set variables on the app service:
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `OPENROUTER_API_KEY` — from https://openrouter.ai/keys
   - `OPENROUTER_MODEL` — optional, defaults to `anthropic/claude-sonnet-4.5`
   - `APP_URL` — your Railway public URL
   - `UPLOAD_DIR` — mount a **volume** (e.g. at `/data`) and set this to `/data/uploads` so images survive redeploys
4. Deploy. `railway.json` handles the rest — the start command pushes the Prisma schema to the database, then serves the app.

## Roadmap

- [x] Accounts (register / sign in)
- [x] Any book type with tailored AI behavior (novel, memoir, non-fiction, children's, poetry)
- [x] Studio: threaded AI brainstorming / memoir interviewing, streaming + persisted
- [x] AI outline generation from premise + Studio notes
- [x] AI chapter drafting with cross-chapter consistency
- [x] AI proofreading with revert
- [x] Whole-book coherence review
- [x] Design controls: font, size, line spacing, page size, cover upload
- [x] Page-view book preview
- [ ] **Full-cast audiobook narration** — AI detects characters, assigns each a distinct voice (plus a narrator), and performs the book like a radio drama
- [ ] True pagination (split chapters across fixed pages, page numbers, front matter)
- [ ] Inline photos/illustrations within chapters
- [ ] AI cover art generation
- [ ] Export to PDF / EPUB (print-ready with bleed and margins)
- [ ] Rich text editing (bold/italic, pull quotes)
- [ ] Character/continuity "bible" the AI maintains automatically
- [ ] Chapter reordering and custom chapters in the UI
- [ ] Migrate `prisma db push` to versioned migrations (`prisma migrate`)
- [ ] Object storage (S3/R2) for uploads at scale
