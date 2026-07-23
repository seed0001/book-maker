import { kindLabel } from "@/lib/bookKinds";

type BookContext = {
  title: string;
  kind: string;
  premise: string;
  chapterTitles: string[];
};

/** Shared context block injected into every AI prompt for a book. */
export function bookContextBlock(book: BookContext): string {
  const lines = [
    `BOOK CONTEXT`,
    `Title: ${book.title}`,
    `Type: ${kindLabel(book.kind)}`,
  ];
  if (book.premise.trim()) lines.push(`Premise/notes: ${book.premise.trim()}`);
  if (book.chapterTitles.length > 0) {
    lines.push(`Current chapter outline: ${book.chapterTitles.join(" · ")}`);
  }
  return lines.join("\n");
}

/** System prompt for the Studio chat, tailored to the book kind. */
export function chatSystemPrompt(book: BookContext, topic: string): string {
  const base =
    `You are an expert book-development partner — part editor, part muse — ` +
    `collaborating on the book described below. The current working thread is "${topic}". ` +
    `Be concrete and generative: offer storylines, angles, structures, and vivid options rather than vague advice. ` +
    `Keep responses tight (a short reaction plus your contribution), and end with ONE focused question ` +
    `or 2-3 concrete options to keep momentum. Everything discussed here becomes source material for drafting chapters.`;

  const byKind: Record<string, string> = {
    memoir:
      ` For this memoir, act as a warm, skilled biographer: interview the author one thoughtful question at a time, ` +
      `follow up on names, places, sensory details, emotions, and turning points that will make vivid memoir material.`,
    novel:
      ` For this novel, help invent and pressure-test storylines, plot beats, character arcs, stakes, and settings. ` +
      `Flag clichés, spot plot holes, and push toward the more interesting choice.`,
    nonfiction:
      ` For this non-fiction book, help sharpen the thesis, structure the argument, identify the audience, ` +
      `and note where evidence or examples are needed.`,
    childrens:
      ` For this children's book, help with age-appropriate language, rhythm and read-aloud quality, ` +
      `lovable characters, and gentle story arcs. Suggest illustration moments.`,
    poetry:
      ` For this poetry collection, explore themes, forms, imagery, and the arc of the collection. ` +
      `Riff on lines and offer variations without flattening the poet's voice.`,
  };

  return base + (byKind[book.kind] ?? "") + "\n\n" + bookContextBlock(book);
}

/** System prompt for drafting a chapter, tailored to the book kind. */
export function draftSystemPrompt(kind: string): string {
  const common =
    "You are a gifted ghostwriter drafting one chapter of the book described in the material provided. " +
    "Use the premise, outline, existing chapters, and development notes/transcripts as your source. " +
    "Write flowing prose in plain paragraphs — no markdown headers, no meta-commentary. " +
    "Stay consistent with names, facts, tone, and events established elsewhere in the book. ";
  const byKind: Record<string, string> = {
    memoir:
      "Write in the first person, in the author's own voice, using ONLY facts, names, and events from their " +
      "interview transcripts — never invent events. Aim for 500-1200 words depending on available material.",
    novel:
      "Write immersive fiction with scene, dialogue, and interiority. Advance the plot described in the notes. " +
      "Aim for 1000-2000 words.",
    nonfiction:
      "Write clear, engaging non-fiction prose with a strong through-line. Where a claim needs a source, " +
      "mark it [source needed]. Aim for 800-1500 words.",
    childrens:
      "Write age-appropriate, read-aloud-friendly text with rhythm and warmth. Keep it short and note " +
      "illustration moments in [brackets].",
    poetry:
      "Write poems fitting this section's theme, honoring the style discussed in the notes. Separate poems " +
      "with a blank line and give each a title on its own line.",
  };
  return common + (byKind[kind] ?? "Aim for 800-1500 words.");
}
