import { createEmptyCard, fsrs, type Grade, Rating as FsrsRating } from "ts-fsrs";
import type { Card, Rating, Review, Store } from "@/types/lexilo";

const scheduler = fsrs();

export const FSRS_RATING_MAP: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

export function recalculateStoreStats(store: Store, now = Date.now()): Store {
  const decks = store.decks.map((deck) => {
    const deckCards = store.cards.filter((card) => card.deckId === deck.id);
    const dueCount = deckCards.filter((card) => card.due <= now).length;
    return {
      ...deck,
      cardCount: deckCards.length,
      dueCount,
    };
  });
  return { ...store, decks };
}

export function scheduleCardReview(
  card: Card,
  ratingName: Rating,
  reviewedAt = new Date(),
): { updatedCard: Card; review: Review } {
  const fsrsGrade = FSRS_RATING_MAP[ratingName];

  const fsrsCard = createEmptyCard(reviewedAt);
  fsrsCard.reps = card.reps;
  fsrsCard.lapses = card.lapses;

  const nextRecord = scheduler.next(fsrsCard, reviewedAt, fsrsGrade);
  const nextFsrsCard = nextRecord.card;

  const updatedCard: Card = {
    ...card,
    due: new Date(nextFsrsCard.due).getTime(),
    interval: nextFsrsCard.scheduled_days,
    reps: nextFsrsCard.reps,
    lapses: nextFsrsCard.lapses,
  };

  const review: Review = {
    id: reviewedAt.getTime(),
    cardId: card.id,
    rating: ratingName,
    date: reviewedAt.toISOString().slice(0, 10),
    reviewedAt: reviewedAt.toISOString(),
  };

  return { updatedCard, review };
}
