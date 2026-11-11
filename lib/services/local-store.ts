import {
  DECK_PRESET_COLORS,
  STORAGE_KEYS,
  createDefaultSeedStore,
} from "@/lib/config/constants";
import { normalizePartOfSpeech } from "@/lib/domain/cards";
import { recalculateStoreStats, scheduleCardReview } from "@/lib/domain/fsrs";
import type {
  BackupPayload,
  Card,
  CardDraft,
  Deck,
  Rating,
  RawBackupCard,
  RawBackupDeck,
  Store,
} from "@/types/lexilo";

function getSeedStore(): Store {
  return createDefaultSeedStore();
}

export function loadLocalStore(): Store {
  const fallback = getSeedStore();
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.STORE);
    if (!raw) {
      return saveLocalStore(fallback);
    }
    const parsed = JSON.parse(raw) as Partial<Store> | null;
    if (parsed && Array.isArray(parsed.decks) && Array.isArray(parsed.cards)) {
      return recalculateStoreStats({
        decks: parsed.decks,
        cards: parsed.cards,
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      });
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalStore(store: Store): Store {
  const recalculated = recalculateStoreStats(store);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(recalculated));
    } catch (error) {
      console.warn("Could not save to localStorage", error);
    }
  }
  return recalculated;
}

export function localCreateDeck(name: string, color?: string): Store {
  const store = loadLocalStore();
  const finalColor =
    color || DECK_PRESET_COLORS[store.decks.length % DECK_PRESET_COLORS.length].value;
  const newDeck: Deck = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: finalColor,
    cardCount: 0,
    dueCount: 0,
  };
  return saveLocalStore({
    ...store,
    decks: [...store.decks, newDeck],
  });
}

export function localUpdateDeck(id: string, name: string, color?: string): Store {
  const store = loadLocalStore();
  const decks = store.decks.map((deck) =>
    deck.id === id ? { ...deck, name: name.trim(), color: color || deck.color } : deck,
  );
  return saveLocalStore({ ...store, decks });
}

export function localDeleteDeck(id: string): Store {
  const store = loadLocalStore();
  if (store.decks.length <= 1) {
    throw new Error("Không thể xóa bộ thẻ duy nhất còn lại. Hãy tạo bộ thẻ mới trước khi xóa.");
  }
  return saveLocalStore({
    ...store,
    decks: store.decks.filter((deck) => deck.id !== id),
    cards: store.cards.filter((card) => card.deckId !== id),
  });
}

export function localAddCards(deckId: string, drafts: CardDraft[]): Store {
  const store = loadLocalStore();
  const now = Date.now();
  const newCards: Card[] = drafts
    .filter((draft) => draft.front.trim() && draft.back.trim())
    .map((draft) => ({
      id: crypto.randomUUID(),
      deckId,
      front: draft.front.trim(),
      ipa: draft.ipa.trim(),
      partOfSpeech: normalizePartOfSpeech(draft.partOfSpeech),
      back: draft.back.trim(),
      example: draft.example.trim(),
      isDifficult: false,
      due: now,
      interval: 0,
      reps: 0,
      lapses: 0,
    }));

  if (!newCards.length) {
    throw new Error("Không có thẻ hợp lệ để lưu.");
  }

  return saveLocalStore({
    ...store,
    cards: [...store.cards, ...newCards],
  });
}

export function localUpdateCard(cardId: string, draft: CardDraft): Store {
  const store = loadLocalStore();
  const cards = store.cards.map((card) =>
    card.id === cardId
      ? {
          ...card,
          front: draft.front.trim(),
          ipa: draft.ipa.trim(),
          partOfSpeech: normalizePartOfSpeech(draft.partOfSpeech),
          back: draft.back.trim(),
          example: draft.example.trim(),
        }
      : card,
  );
  return saveLocalStore({ ...store, cards });
}

export function localToggleDifficult(cardId: string): Store {
  const store = loadLocalStore();
  const cards = store.cards.map((card) =>
    card.id === cardId ? { ...card, isDifficult: !card.isDifficult } : card,
  );
  return saveLocalStore({ ...store, cards });
}

export function localDeleteCard(cardId: string): Store {
  const store = loadLocalStore();
  return saveLocalStore({
    ...store,
    cards: store.cards.filter((card) => card.id !== cardId),
  });
}

export function localReviewCard(
  cardId: string,
  ratingName: Rating,
): { state: Store; card: Card } {
  const store = loadLocalStore();
  const cardIndex = store.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error("Không tìm thấy thẻ");
  }

  const { updatedCard, review } = scheduleCardReview(store.cards[cardIndex], ratingName);
  const newCards = [...store.cards];
  newCards[cardIndex] = updatedCard;

  const updatedStore = saveLocalStore({
    ...store,
    cards: newCards,
    reviews: [...store.reviews, review],
  });

  return { state: updatedStore, card: updatedCard };
}

export function localBatchReview(results: { cardId: string; rating: Rating }[]): { state: Store } {
  let currentStore = loadLocalStore();
  for (const item of results) {
    try {
      const res = localReviewCard(item.cardId, item.rating);
      currentStore = res.state;
    } catch {
      // ignore missing card in batch
    }
  }
  return { state: currentStore };
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.decks) && Array.isArray(candidate.cards);
}

export function localRestore(backupData: unknown): Store {
  if (!isBackupPayload(backupData)) {
    throw new Error("File sao lưu không đúng định dạng.");
  }

  const defaultDeckId = String(backupData.decks[0]?.id || "daily");
  const now = Date.now();

  const restored: Store = {
    decks: backupData.decks.map((d: RawBackupDeck) => ({
      id: String(d.id || crypto.randomUUID()),
      name: String(d.name || "Bộ thẻ mới"),
      color: String(d.color || "#6c63ff"),
      cardCount: 0,
      dueCount: 0,
    })),
    cards: backupData.cards.map((c: RawBackupCard) => ({
      id: String(c.id || crypto.randomUUID()),
      deckId: String(c.deckId || defaultDeckId),
      front: String(c.front || ""),
      ipa: String(c.ipa || ""),
      partOfSpeech: normalizePartOfSpeech(c.partOfSpeech),
      back: String(c.back || ""),
      example: String(c.example || ""),
      isDifficult: Boolean(c.isDifficult),
      due: typeof c.due === "number" ? c.due : now,
      interval: Number(c.interval) || 0,
      reps: Number(c.reps) || 0,
      lapses: Number(c.lapses) || 0,
    })),
    reviews: Array.isArray(backupData.reviews) ? backupData.reviews : [],
  };
  return saveLocalStore(restored);
}

export function buildLocalBackup(store: Store): BackupPayload {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    decks: store.decks,
    cards: store.cards,
    reviews: store.reviews,
  };
}
