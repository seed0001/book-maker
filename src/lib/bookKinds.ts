export type BookKind =
  | "novel"
  | "memoir"
  | "nonfiction"
  | "childrens"
  | "poetry"
  | "other";

export const BOOK_KINDS: { value: BookKind; label: string }[] = [
  { value: "novel", label: "Novel / Fiction" },
  { value: "memoir", label: "Memoir / Autobiography" },
  { value: "nonfiction", label: "Non-fiction" },
  { value: "childrens", label: "Children's book" },
  { value: "poetry", label: "Poetry collection" },
  { value: "other", label: "Something else" },
];

export function kindLabel(kind: string): string {
  return BOOK_KINDS.find((k) => k.value === kind)?.label ?? "Book";
}

/** Starter chapter lists per book kind. */
export function starterChapters(kind: string): string[] {
  switch (kind) {
    case "memoir":
      return [
        "Childhood",
        "Family & Roots",
        "Coming of Age",
        "Career & Calling",
        "Love & Relationships",
        "Trials & Triumphs",
        "Lessons & Legacy",
      ];
    case "poetry":
      return ["Part I", "Part II", "Part III"];
    default:
      return ["Chapter 1", "Chapter 2", "Chapter 3"];
  }
}

/** Suggested Studio brainstorm threads per book kind. */
export function suggestedThreads(kind: string): string[] {
  switch (kind) {
    case "memoir":
      return [
        "Childhood",
        "Family & Roots",
        "Coming of Age",
        "Career & Calling",
        "Love & Relationships",
        "Trials & Triumphs",
        "Lessons & Legacy",
      ];
    case "novel":
      return ["Premise & Themes", "Plot & Structure", "Characters", "World & Setting"];
    case "nonfiction":
      return ["Thesis & Angle", "Audience", "Structure", "Research Notes"];
    case "childrens":
      return ["Story Idea", "Characters", "Age & Tone", "Illustrations"];
    case "poetry":
      return ["Themes", "Forms & Style", "Collection Arc"];
    default:
      return ["Ideas", "Structure", "Style & Voice"];
  }
}
