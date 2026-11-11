import { PART_OF_SPEECH_ALIASES } from "@/lib/config/constants";
import type { Card, CardDraft, Deck } from "@/types/lexilo";

export function normalizePartOfSpeech(value: unknown): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return PART_OF_SPEECH_ALIASES[normalized] || normalized;
}

export function emptyDraft(): CardDraft {
  return { front: "", ipa: "", partOfSpeech: "", back: "", example: "" };
}

export interface CardFilterOptions {
  deckId?: string;
  search?: string;
  scope?: "all" | "due" | "hard";
  now?: number;
}

export function filterCards(cards: Card[], options: CardFilterOptions): Card[] {
  const { deckId = "all", search = "", scope = "all", now = Date.now() } = options;
  const query = search.trim().toLowerCase();

  return cards.filter((card) => {
    if (deckId !== "all" && card.deckId !== deckId) return false;
    if (scope === "due" && card.due > now) return false;
    if (scope === "hard" && !card.isDifficult) return false;
    if (!query) return true;

    return (
      card.front.toLowerCase().includes(query) ||
      card.back.toLowerCase().includes(query) ||
      card.example.toLowerCase().includes(query)
    );
  });
}

export interface DeckStats {
  total: number;
  due: number;
  hard: number;
}

export function computeDeckStatsMap(
  decks: Deck[],
  cards: Card[],
  now: number,
): Map<string, DeckStats> {
  const map = new Map<string, DeckStats>();
  for (const deck of decks) {
    map.set(deck.id, { total: 0, due: 0, hard: 0 });
  }
  for (const card of cards) {
    const entry = map.get(card.deckId);
    if (!entry) continue;
    entry.total += 1;
    if (card.due <= now) entry.due += 1;
    if (card.isDifficult) entry.hard += 1;
  }
  return map;
}
