"use client";

import { useCallback, useEffect, useState } from "react";
import { createDefaultSeedStore } from "@/lib/config/constants";
import { downloadTextFile } from "@/lib/domain/importer";
import * as repository from "@/lib/services/lexilo-repository";
import { saveLocalStore } from "@/lib/services/local-store";
import type { Card, CardDraft, Notice, Rating, Store } from "@/types/lexilo";
import { useCloudSync } from "./use-cloud-sync";

const INITIAL_STORE = createDefaultSeedStore(0);

export function useLexiloStore(showNotice: (kind: Notice["kind"], text: string) => void) {
  const [data, setData] = useState<Store>(INITIAL_STORE);
  const [ready, setReady] = useState(false);
  const [ollama, setOllama] = useState(false);
  const [now, setNow] = useState<number>(0);
  const [selectedDeckId, setSelectedDeckId] = useState("daily");

  const ensureValidDeckSelection = useCallback((store: Store) => {
    setSelectedDeckId((current) => {
      if (store.decks.length > 0 && !store.decks.some((d) => d.id === current)) {
        return store.decks[0].id;
      }
      return current;
    });
  }, []);

  const handleCloudStoreLoaded = useCallback(
    (cloudStore: Store) => {
      const saved = saveLocalStore(cloudStore);
      setData(saved);
      setNow(Date.now());
      ensureValidDeckSelection(saved);
    },
    [ensureValidDeckSelection],
  );

  const { cloudUser, pushIfAuthenticated, refreshCloudUser } =
    useCloudSync(handleCloudStoreLoaded);

  const commitState = useCallback(
    (nextStore: Store) => {
      const saved = saveLocalStore(nextStore);
      setData(saved);
      setNow(Date.now());
      pushIfAuthenticated(saved);
      return saved;
    },
    [pushIfAuthenticated],
  );

  useEffect(() => {
    let active = true;
    repository
      .initializeRepositoryState()
      .then(({ store, ollamaAvailable }) => {
        if (!active) return;
        setData(store);
        setOllama(ollamaAvailable);
        setNow(Date.now());
        ensureValidDeckSelection(store);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [ensureValidDeckSelection]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const saveDeck = useCallback(
    async (deckData: { name: string; color: string }, existingDeckId?: string): Promise<Store> => {
      const state = existingDeckId
        ? await repository.updateDeck(existingDeckId, deckData.name, deckData.color)
        : await repository.createDeck(deckData.name, deckData.color);
      const saved = commitState(state);
      if (!existingDeckId) {
        const created = saved.decks.at(-1);
        if (created) setSelectedDeckId(created.id);
        showNotice("success", `Đã tạo bộ thẻ "${deckData.name}".`);
      } else {
        showNotice("success", `Đã cập nhật bộ thẻ "${deckData.name}".`);
      }
      return saved;
    },
    [commitState, showNotice],
  );

  const removeDeck = useCallback(
    async (deckId: string, deckName: string): Promise<Store> => {
      const state = await repository.deleteDeck(deckId);
      const saved = commitState(state);
      ensureValidDeckSelection(saved);
      showNotice("success", `Đã xóa bộ thẻ "${deckName}".`);
      return saved;
    },
    [commitState, ensureValidDeckSelection, showNotice],
  );

  const createCards = useCallback(
    async (deckId: string, drafts: CardDraft[], successMessage?: string): Promise<Store> => {
      const state = await repository.addCards(deckId, drafts);
      const saved = commitState(state);
      if (successMessage) {
        showNotice("success", successMessage);
      }
      return saved;
    },
    [commitState, showNotice],
  );

  const editCard = useCallback(
    async (cardId: string, draft: CardDraft): Promise<Store> => {
      const state = await repository.updateCard(cardId, draft);
      const saved = commitState(state);
      showNotice("success", "Đã cập nhật thẻ.");
      return saved;
    },
    [commitState, showNotice],
  );

  const removeCard = useCallback(
    async (cardId: string): Promise<boolean> => {
      if (!window.confirm("Bạn muốn xóa thẻ này?")) return false;
      try {
        const state = await repository.deleteCard(cardId);
        commitState(state);
        showNotice("success", "Đã xóa thẻ.");
        return true;
      } catch (error) {
        showNotice("error", (error as Error).message);
        return false;
      }
    },
    [commitState, showNotice],
  );

  const toggleDifficult = useCallback(
    async (card: Card): Promise<void> => {
      try {
        const state = await repository.toggleCardDifficult(card.id, card.isDifficult);
        commitState(state);
        showNotice("success", card.isDifficult ? "Đã bỏ đánh dấu Khó." : "Đã đánh dấu thẻ Khó.");
      } catch (error) {
        showNotice("error", (error as Error).message);
      }
    },
    [commitState, showNotice],
  );

  const reviewCard = useCallback(
    async (cardId: string, rating: Rating): Promise<void> => {
      try {
        const state = await repository.submitCardReview(cardId, rating);
        commitState(state);
      } catch (error) {
        showNotice("error", (error as Error).message);
        throw error;
      }
    },
    [commitState, showNotice],
  );

  const batchReview = useCallback(
    async (results: { cardId: string; rating: Rating }[]): Promise<void> => {
      try {
        const state = await repository.submitBatchReview(results);
        commitState(state);
        showNotice("success", "Đã ghi kết quả vào lịch FSRS.");
      } catch (error) {
        showNotice("error", (error as Error).message);
        throw error;
      }
    },
    [commitState, showNotice],
  );

  const downloadBackup = useCallback(async () => {
    try {
      const backup = await repository.exportStoreBackup(data);
      downloadTextFile(
        JSON.stringify(backup, null, 2),
        "lexilo-backup.json",
        "application/json",
      );
      showNotice("success", "Đã tạo bản sao lưu đầy đủ.");
    } catch (error) {
      showNotice("error", (error as Error).message);
    }
  }, [data, showNotice]);

  const restoreBackupFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed: unknown = JSON.parse(String(reader.result));
          const state = await repository.restoreStoreBackup(parsed);
          const saved = commitState(state);
          ensureValidDeckSelection(saved);
          showNotice("success", "Khôi phục dữ liệu thành công.");
        } catch (error) {
          showNotice("error", (error as Error).message || "File sao lưu không hợp lệ.");
        }
      };
      reader.readAsText(file);
    },
    [commitState, ensureValidDeckSelection, showNotice],
  );

  return {
    data,
    ready,
    ollama,
    now,
    cloudUser,
    selectedDeckId,
    setSelectedDeckId,
    commitState,
    refreshCloudUser,
    saveDeck,
    removeDeck,
    createCards,
    editCard,
    removeCard,
    toggleDifficult,
    reviewCard,
    batchReview,
    downloadBackup,
    restoreBackupFile,
  };
}
