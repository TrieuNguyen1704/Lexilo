import type { CardDraft, Rating, Store } from "@/types/lexilo";
import { requestJson } from "./http";
import {
  buildLocalBackup,
  loadLocalStore,
  localAddCards,
  localBatchReview,
  localCreateDeck,
  localDeleteCard,
  localDeleteDeck,
  localRestore,
  localReviewCard,
  localToggleDifficult,
  localUpdateCard,
  localUpdateDeck,
  saveLocalStore,
} from "./local-store";

let hasLocalApiServer: boolean | null = null;

async function withApiFallback<T>(
  apiCall: () => Promise<T>,
  localFallback: () => T,
): Promise<T> {
  if (hasLocalApiServer === false) {
    return localFallback();
  }

  try {
    const result = await apiCall();
    hasLocalApiServer = true;
    return result;
  } catch {
    return localFallback();
  }
}

export async function initializeRepositoryState(): Promise<{
  store: Store;
  ollamaAvailable: boolean;
}> {
  try {
    const [state, health] = await Promise.all([
      requestJson<Store>("/api/state"),
      requestJson<{ ollama: boolean }>("/api/health"),
    ]);
    hasLocalApiServer = true;
    saveLocalStore(state);
    return { store: state, ollamaAvailable: health.ollama };
  } catch {
    hasLocalApiServer = false;
    return { store: loadLocalStore(), ollamaAvailable: false };
  }
}

export async function createDeck(name: string, color: string): Promise<Store> {
  const store = await withApiFallback(
    () =>
      requestJson<Store>("/api/decks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, color }),
      }),
    () => localCreateDeck(name, color),
  );
  return saveLocalStore(store);
}

export async function updateDeck(id: string, name: string, color: string): Promise<Store> {
  const store = await withApiFallback(
    () =>
      requestJson<Store>(`/api/decks/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, color }),
      }),
    () => localUpdateDeck(id, name, color),
  );
  return saveLocalStore(store);
}

export async function deleteDeck(id: string): Promise<Store> {
  const store = await withApiFallback(
    () => requestJson<Store>(`/api/decks/${id}`, { method: "DELETE" }),
    () => localDeleteDeck(id),
  );
  return saveLocalStore(store);
}

export async function addCards(deckId: string, drafts: CardDraft[]): Promise<Store> {
  const store = await withApiFallback(
    () =>
      requestJson<Store>("/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deckId, cards: drafts }),
      }),
    () => localAddCards(deckId, drafts),
  );
  return saveLocalStore(store);
}

export async function updateCard(cardId: string, draft: CardDraft): Promise<Store> {
  const store = await withApiFallback(
    () =>
      requestJson<Store>(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      }),
    () => localUpdateCard(cardId, draft),
  );
  return saveLocalStore(store);
}

export async function deleteCard(cardId: string): Promise<Store> {
  const store = await withApiFallback(
    () => requestJson<Store>(`/api/cards/${cardId}`, { method: "DELETE" }),
    () => localDeleteCard(cardId),
  );
  return saveLocalStore(store);
}

export async function toggleCardDifficult(cardId: string, currentValue: boolean): Promise<Store> {
  const store = await withApiFallback(
    () =>
      requestJson<Store>(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDifficult: !currentValue }),
      }),
    () => localToggleDifficult(cardId),
  );
  return saveLocalStore(store);
}

export async function submitCardReview(cardId: string, rating: Rating): Promise<Store> {
  const result = await withApiFallback(
    () =>
      requestJson<{ state: Store }>("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId, rating }),
      }),
    () => localReviewCard(cardId, rating),
  );
  return saveLocalStore(result.state);
}

export async function submitBatchReview(
  results: { cardId: string; rating: Rating }[],
): Promise<Store> {
  const result = await withApiFallback(
    () =>
      requestJson<{ state: Store }>("/api/reviews/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ results }),
      }),
    () => localBatchReview(results),
  );
  return saveLocalStore(result.state);
}

export async function generateAiCards(text: string, model = "qwen3.5:2b"): Promise<CardDraft[]> {
  const payload = await requestJson<{ cards: CardDraft[] }>("/api/ai/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, model }),
  });
  return payload.cards;
}

export async function exportStoreBackup(currentStore: Store): Promise<unknown> {
  return withApiFallback(
    () => requestJson<unknown>("/api/backup"),
    () => buildLocalBackup(currentStore),
  );
}

export async function restoreStoreBackup(backup: unknown): Promise<Store> {
  const store = await withApiFallback(
    () =>
      requestJson<Store>("/api/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(backup),
      }),
    () => localRestore(backup),
  );
  return saveLocalStore(store);
}
