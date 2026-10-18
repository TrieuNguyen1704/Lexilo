import { createEmptyCard, fsrs, Rating as FsrsRating } from "ts-fsrs";
import { Card, CardDraft, Deck, normalizePartOfSpeech, Rating, Review, Store } from "./lexilo";

const STORAGE_KEY = "lexilo_store_v2";
const scheduler = fsrs();

const FSRS_RATING_MAP: Record<Rating, FsrsRating> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

const DEFAULT_STORE: Store = {
  decks: [
    { id: "daily", name: "English hằng ngày", color: "#ff6b4a", cardCount: 3, dueCount: 2 },
    { id: "ielts-core", name: "Từ vựng IELTS thông dụng", color: "#6c63ff", cardCount: 4, dueCount: 3 },
  ],
  cards: [
    {
      id: "1",
      deckId: "daily",
      front: "resilient",
      ipa: "/rɪˈzɪliənt/",
      partOfSpeech: "adjective",
      back: "kiên cường; có khả năng phục hồi nhanh",
      example: "She remained resilient despite facing multiple challenges.",
      isDifficult: false,
      due: Date.now(),
      interval: 0,
      reps: 0,
      lapses: 0,
    },
    {
      id: "2",
      deckId: "daily",
      front: "figure out",
      ipa: "/ˈfɪɡər aʊt/",
      partOfSpeech: "phrasal verb",
      back: "tìm ra; hiểu ra điều gì đó",
      example: "I need to figure out how to solve this issue.",
      isDifficult: true,
      due: Date.now(),
      interval: 1,
      reps: 1,
      lapses: 0,
    },
    {
      id: "3",
      deckId: "daily",
      front: "I’m interested ___ technology.",
      ipa: "",
      partOfSpeech: "",
      back: "in",
      example: "I’m interested in technology and language learning.",
      isDifficult: false,
      due: Date.now() + 86_400_000,
      interval: 1,
      reps: 1,
      lapses: 0,
    },
    {
      id: "4",
      deckId: "ielts-core",
      front: "crucial",
      ipa: "/ˈkruːʃəl/",
      partOfSpeech: "adjective",
      back: "cực kỳ quan trọng; cốt yếu",
      example: "Early diagnosis is crucial for successful treatment.",
      isDifficult: false,
      due: Date.now(),
      interval: 0,
      reps: 0,
      lapses: 0,
    },
    {
      id: "5",
      deckId: "ielts-core",
      front: "elaborate",
      ipa: "/ɪˈlæbərət/",
      partOfSpeech: "adjective",
      back: "phức tạp; tỉ mỉ, công phu",
      example: "They made elaborate preparations for the festival.",
      isDifficult: true,
      due: Date.now(),
      interval: 0,
      reps: 0,
      lapses: 0,
    },
    {
      id: "6",
      deckId: "ielts-core",
      front: "mitigate",
      ipa: "/ˈmɪtɪɡeɪt/",
      partOfSpeech: "verb",
      back: "giảm thiểu; làm dịu bớt",
      example: "Measures need to be taken to mitigate the risks.",
      isDifficult: false,
      due: Date.now(),
      interval: 0,
      reps: 0,
      lapses: 0,
    },
    {
      id: "7",
      deckId: "ielts-core",
      front: "prospective",
      ipa: "/prəˈspektɪv/",
      partOfSpeech: "adjective",
      back: "có triển vọng; tiềm năng, tương lai",
      example: "We interviewed prospective candidates for the role.",
      isDifficult: false,
      due: Date.now() + 86_400_000 * 2,
      interval: 2,
      reps: 1,
      lapses: 0,
    },
  ],
  reviews: [],
};

function recalculateDeckCounts(store: Store): Store {
  const now = Date.now();
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

export function loadLocalStore(): Store {
  if (typeof window === "undefined") return DEFAULT_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveLocalStore(DEFAULT_STORE);
      return DEFAULT_STORE;
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.decks) && Array.isArray(parsed.cards)) {
      return recalculateDeckCounts(parsed);
    }
    return DEFAULT_STORE;
  } catch {
    return DEFAULT_STORE;
  }
}

export function saveLocalStore(store: Store): Store {
  const recalculated = recalculateDeckCounts(store);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recalculated));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  }
  return recalculated;
}

export function localCreateDeck(name: string, color?: string): Store {
  const store = loadLocalStore();
  const colors = ["#ff6b4a", "#6c63ff", "#17a673", "#e9a11b", "#2563eb", "#ec4899", "#0d9488"];
  const finalColor = color || colors[store.decks.length % colors.length];
  const newDeck: Deck = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: finalColor,
    cardCount: 0,
    dueCount: 0,
  };
  const updated: Store = {
    ...store,
    decks: [...store.decks, newDeck],
  };
  return saveLocalStore(updated);
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
  const decks = store.decks.filter((deck) => deck.id !== id);
  const cards = store.cards.filter((card) => card.deckId !== id);
  return saveLocalStore({ ...store, decks, cards });
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

  const updated: Store = {
    ...store,
    cards: [...store.cards, ...newCards],
  };
  return saveLocalStore(updated);
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
  const cards = store.cards.filter((card) => card.id !== cardId);
  return saveLocalStore({ ...store, cards });
}

export function localReviewCard(cardId: string, ratingName: Rating): { state: Store; card: Card } {
  const store = loadLocalStore();
  const cardIndex = store.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error("Không tìm thấy thẻ");
  }

  const card = store.cards[cardIndex];
  const fsrsRating = FSRS_RATING_MAP[ratingName];
  const now = new Date();

  // Create or hydrate FSRS card representation
  const fsrsCard = createEmptyCard(now);
  fsrsCard.reps = card.reps;
  fsrsCard.lapses = card.lapses;

  const nextRecord = scheduler.next(fsrsCard, now, fsrsRating);
  const updatedFsrsCard = nextRecord.card;

  const updatedCard: Card = {
    ...card,
    due: new Date(updatedFsrsCard.due).getTime(),
    interval: updatedFsrsCard.scheduled_days,
    reps: updatedFsrsCard.reps,
    lapses: updatedFsrsCard.lapses,
  };

  const newReview: Review = {
    id: Date.now(),
    cardId: card.id,
    rating: ratingName,
    date: now.toISOString().slice(0, 10),
    reviewedAt: now.toISOString(),
  };

  const newCards = [...store.cards];
  newCards[cardIndex] = updatedCard;

  const updatedStore = saveLocalStore({
    ...store,
    cards: newCards,
    reviews: [...store.reviews, newReview],
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

export function localRestore(backupData: any): Store {
  if (!backupData || !Array.isArray(backupData.decks) || !Array.isArray(backupData.cards)) {
    throw new Error("File sao lưu không đúng định dạng.");
  }
  const restored: Store = {
    decks: backupData.decks.map((d: any) => ({
      id: String(d.id || crypto.randomUUID()),
      name: String(d.name || "Bộ thẻ mới"),
      color: String(d.color || "#6c63ff"),
      cardCount: 0,
      dueCount: 0,
    })),
    cards: backupData.cards.map((c: any) => ({
      id: String(c.id || crypto.randomUUID()),
      deckId: String(c.deckId || backupData.decks[0]?.id || "daily"),
      front: String(c.front || ""),
      ipa: String(c.ipa || ""),
      partOfSpeech: normalizePartOfSpeech(c.partOfSpeech),
      back: String(c.back || ""),
      example: String(c.example || ""),
      isDifficult: Boolean(c.isDifficult),
      due: typeof c.due === "number" ? c.due : Date.now(),
      interval: Number(c.interval) || 0,
      reps: Number(c.reps) || 0,
      lapses: Number(c.lapses) || 0,
    })),
    reviews: Array.isArray(backupData.reviews) ? backupData.reviews : [],
  };
  return saveLocalStore(restored);
}
