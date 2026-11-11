import type { CardDraft } from "./lexilo";

export type Screen =
  | "today"
  | "library"
  | "import"
  | "deck"
  | "scheduled"
  | "flashcards"
  | "learn"
  | "test"
  | "match";

export type ImportMode = "pairs" | "cloze" | "ai";

export type PreviewCard = CardDraft & {
  id: string;
  selected: boolean;
};

export interface WeekDayStat {
  label: string;
  count: number;
  dateStr: string;
  isToday: boolean;
}

export type NotificationStatus = "unsupported" | "default" | "granted" | "denied";
