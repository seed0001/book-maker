# BookMaker

**Your life, beautifully told.** BookMaker is a web platform for authoring autobiographies. An AI biographer interviews you about every era of your life, turns your answers into first-person chapters, and lets you design the result into a real book — fonts, page sizes, page-view preview, cover art, and your own photos.

## How it works

1. **Sign up** and create a book. It starts with seven life-area chapters: Childhood, Family & Roots, Coming of Age, Career & Calling, Love & Relationships, Trials & Triumphs, Lessons & Legacy.
2. **Interview** — pick a life area and chat with the AI biographer. It asks one thoughtful question at a time and follows up on the details that make good memoir material. Every exchange is saved.
3. **Write** — draft chapters yourself, or hit *"Draft from interviews"* and the AI ghostwrites the chapter in your voice from your interview transcript. Edit freely.
4. **Design** — choose the body font, font size, line spacing, and page size (5×8, 6×9, A5, Letter). Upload cover art.
5. **Preview** — see the book page by page with your design applied, cover first.

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

## Data model

`User` → `Book` (title, subtitle, cover, design `settings` JSON) → `Chapter` (ordered, prose content) and `InterviewSession` (one per life-area topic) → `InterviewMessage`. `Asset` records uploaded images stored on disk/volume.

## Local development

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, OPENROUTER_API_KEY
npx prisma db push          # create tables
npm run dev
```

## Deploying to Railway

1. Create a Railway project → **Deploy from GitHub repo** → pick `seed0001/book-maker`.
2. Add a **PostgreSQL** service. Railway exposes `DATABASE_URL`; reference it in the app service's variables (`${{Postgres.DATABASE_URL}}`).
3. Set variables on the app service:
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `OPENROUTER_API_KEY` — from https://openrouter.ai/keys
   - `OPENROUTER_MODEL` — optional, defaults to `anthropic/claude-sonnet-4.5`
   - `APP_URL` — your Railway public URL
   - `UPLOAD_DIR` — mount a **volume** (e.g. at `/data`) and set this to `/data/uploads` so images survive redeploys
4. Deploy. `railway.json` handles the rest — the start command pushes the Prisma schema to the database, then serves the app.

## Roadmap

- [x] Accounts (register / sign in)
- [x] Book CRUD with starter life-area chapters
- [x] AI interviewer with per-topic streaming chat, persisted transcripts
- [x] AI chapter drafting from interview transcripts
- [x] Chapter editor
- [x] Design controls: font, size, line spacing, page size, cover upload
- [x] Page-view book preview
- [ ] True pagination (split chapters across fixed pages, page numbers, front matter)
- [ ] Inline photos within chapters (captions, layout)
- [ ] AI cover art generation
- [ ] Export to PDF / EPUB (print-ready with bleed and margins)
- [ ] Rich text editing (bold/italic, pull quotes)
- [ ] AI editing passes (tone, length, fact-check against transcript)
- [ ] Chapter reordering, custom chapters, multiple books per account (already supported in data model)
- [ ] Migrate `prisma db push` to versioned migrations (`prisma migrate`)
- [ ] Object storage (S3/R2) for uploads at scale
