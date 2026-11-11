export type Rating = "again" | "hard" | "good" | "easy";

export type Direction = "en-vi" | "vi-en";

export type DirectionChoice = Direction | "both";

export type QuestionKind = "multiple-choice" | "typing";

export interface Card {
  id: string;
  deckId: string;
  front: string;
  ipa: string;
  partOfSpeech: string;
  back: string;
  example: string;
  isDifficult: boolean;
  due: number;
  interval: number;
  reps: number;
  lapses: number;
}

export type CardDraft = Pick<Card, "front" | "ipa" | "partOfSpeech" | "back" | "example">;

export interface Deck {
  id: string;
  name: string;
  color: string;
  cardCount?: number;
  dueCount?: number;
}

export interface Review {
  id?: number;
  cardId?: string;
  date: string;
  reviewedAt?: string;
  rating: Rating | number;
}

export interface Store {
  decks: Deck[];
  cards: Card[];
  reviews: Review[];
}

export interface RawBackupDeck {
  id?: unknown;
  name?: unknown;
  color?: unknown;
}

export interface RawBackupCard {
  id?: unknown;
  deckId?: unknown;
  front?: unknown;
  ipa?: unknown;
  partOfSpeech?: unknown;
  back?: unknown;
  example?: unknown;
  isDifficult?: unknown;
  due?: unknown;
  interval?: unknown;
  reps?: unknown;
  lapses?: unknown;
}

export interface BackupPayload {
  version?: number;
  exportedAt?: string;
  decks: RawBackupDeck[];
  cards: RawBackupCard[];
  reviews?: Review[];
}

export interface CloudUser {
  id?: string;
  email?: string;
}

export interface Notice {
  kind: "success" | "error";
  text: string;
}
