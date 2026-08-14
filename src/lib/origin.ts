export const ORIGIN_LABEL: Record<string, string> = {
  human: "Human-created",
  ai_generated: "AI-generated",
  ai_assisted: "AI-assisted",
};

export const ORIGIN_OPTIONS = [
  {
    value: "human",
    label: "Human-created",
    hint: "Captured or authored by a person, no generative model involved.",
  },
  {
    value: "ai_generated",
    label: "AI-generated",
    hint: "Produced primarily by a generative model.",
  },
  {
    value: "ai_assisted",
    label: "AI-assisted",
    hint: "Human-authored, with generative tooling used in the process.",
  },
] as const;
