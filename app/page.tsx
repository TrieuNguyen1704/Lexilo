"use client";

import { useMemo, useState } from "react";
import { TodayPanel } from "@/components/dashboard/today-panel";
import { DeckDetailPanel } from "@/components/decks/deck-detail-panel";
import { AddCardDialog } from "@/components/decks/dialogs/add-card-dialog";
import { DeckFormDialog } from "@/components/decks/dialogs/deck-form-dialog";
import { DeleteDeckDialog } from "@/components/decks/dialogs/delete-deck-dialog";
import { EditCardDialog } from "@/components/decks/dialogs/edit-card-dialog";
import { LibraryPanel } from "@/components/decks/library-panel";
import { ImportPanel } from "@/components/import/import-panel";
import { AppHeader } from "@/components/layout/app-header";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { LoadingState } from "@/components/layout/loading-state";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import type { NavItem } from "@/components/layout/navigation-config";
import { NoticeToast } from "@/components/layout/notice-toast";
import { CloudSyncDialog } from "@/components/settings/cloud-sync-dialog";
import { NotificationDialog } from "@/components/settings/notification-dialog";
import { FlashcardsMode } from "@/components/study/flashcards-mode";
import { LearnMode } from "@/components/study/learn-mode";
import { MatchMode } from "@/components/study/match-mode";
import { ScheduledStudy } from "@/components/study/scheduled-study";
import { TestMode } from "@/components/study/test-mode";
import { useLexiloStore } from "@/hooks/use-lexilo-store";
import { useNotice } from "@/hooks/use-notice";
import { useStudyNotifications } from "@/hooks/use-study-notifications";
import { cardsToCsv, downloadTextFile } from "@/lib/domain/importer";
import { buildWeeklyRhythm, todayDateKey } from "@/lib/domain/streak";
import type { Card, CardDraft, Deck } from "@/types/lexilo";
import type { Screen } from "@/types/navigation";

export default function Home() {
  const { notice, showNotice } = useNotice();
  const store = useLexiloStore(showNotice);
  useStudyNotifications(store.ready, store.data.cards);

  const [screen, setScreen] = useState<Screen>("today");
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);
  const [scheduledBack, setScheduledBack] = useState<"today" | "deck">("today");

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editCardBusy, setEditCardBusy] = useState(false);
  const [editCardError, setEditCardError] = useState("");

  const [addingCardToDeck, setAddingCardToDeck] = useState<Deck | null>(null);
  const [addCardBusy, setAddCardBusy] = useState(false);
  const [addCardError, setAddCardError] = useState("");

  const [deckDialog, setDeckDialog] = useState<{ open: boolean; deck?: Deck | null }>({
    open: false,
  });
  const [deckDialogBusy, setDeckDialogBusy] = useState(false);
  const [deckDialogError, setDeckDialogError] = useState("");

  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
  const [deleteDeckBusy, setDeleteDeckBusy] = useState(false);

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);

  const due = useMemo(
    () => store.data.cards.filter((card) => card.due <= store.now),
    [store.data.cards, store.now],
  );
  const selectedDeck =
    store.data.decks.find((deck) => deck.id === store.selectedDeckId) || store.data.decks[0];
  const deckCards = useMemo(
    () => store.data.cards.filter((card) => card.deckId === selectedDeck?.id),
    [store.data.cards, selectedDeck?.id],
  );
  const deckDue = useMemo(
    () => deckCards.filter((card) => card.due <= store.now),
    [deckCards, store.now],
  );
  const scheduledCards = useMemo(
    () => store.data.cards.filter((card) => scheduledIds.includes(card.id)),
    [store.data.cards, scheduledIds],
  );

  const todayKey = todayDateKey();
  const todayCount = useMemo(
    () => store.data.reviews.filter((review) => review.date === todayKey).length,
    [store.data.reviews, todayKey],
  );
  const week = useMemo(() => buildWeeklyRhythm(store.data.reviews), [store.data.reviews]);

  function openDeck(deckId: string) {
    store.setSelectedDeckId(deckId);
    setScreen("deck");
  }

  function startScheduled(cards: Card[], deckId?: string) {
    if (!cards.length) {
      showNotice("error", "Hiện không có thẻ nào đến hạn trong lựa chọn này.");
      return;
    }
    if (deckId) store.setSelectedDeckId(deckId);
    setScheduledBack(deckId ? "deck" : "today");
    setScheduledIds(cards.map((card) => card.id));
    setScreen("scheduled");
  }

  function handleNavSelect(key: NavItem["key"]) {
    if (key === "scheduled") {
      startScheduled(due);
      return;
    }
    setScreen(key);
  }

  async function handleSaveDeck(deckData: { name: string; color: string }) {
    setDeckDialogBusy(true);
    setDeckDialogError("");
    try {
      await store.saveDeck(deckData, deckDialog.deck?.id);
      setDeckDialog({ open: false });
    } catch (error) {
      setDeckDialogError((error as Error).message);
    } finally {
      setDeckDialogBusy(false);
    }
  }

  async function handleDeleteDeck() {
    if (!deletingDeck) return;
    setDeleteDeckBusy(true);
    try {
      const targetId = deletingDeck.id;
      await store.removeDeck(targetId, deletingDeck.name);
      setDeletingDeck(null);
      if (store.selectedDeckId === targetId && screen === "deck") {
        setScreen("library");
      }
    } catch (error) {
      showNotice("error", (error as Error).message);
    } finally {
      setDeleteDeckBusy(false);
    }
  }

  async function handleAddSingleCard(draft: CardDraft, keepOpen = false): Promise<boolean> {
    if (!addingCardToDeck) return false;
    setAddCardBusy(true);
    setAddCardError("");
    try {
      await store.createCards(addingCardToDeck.id, [draft], `Đã thêm thẻ "${draft.front}".`);
      if (!keepOpen) setAddingCardToDeck(null);
      return true;
    } catch (error) {
      setAddCardError((error as Error).message);
      return false;
    } finally {
      setAddCardBusy(false);
    }
  }

  async function handleSaveCards(
    deckId: string,
    drafts: CardDraft[],
    successMessage = "Đã lưu thẻ vào thư viện.",
  ): Promise<boolean> {
    if (!drafts.length) {
      showNotice("error", "Chưa có thẻ hợp lệ để lưu.");
      return false;
    }
    try {
      await store.createCards(deckId, drafts, successMessage);
      setScreen("library");
      return true;
    } catch (error) {
      showNotice("error", (error as Error).message);
      return false;
    }
  }

  async function handleSaveEditCard(draft: CardDraft) {
    if (!editingCard) return;
    setEditCardBusy(true);
    setEditCardError("");
    try {
      await store.editCard(editingCard.id, draft);
      setEditingCard(null);
    } catch (error) {
      setEditCardError((error as Error).message);
    } finally {
      setEditCardBusy(false);
    }
  }

  function renderActiveScreen() {
    const deckTitle = selectedDeck?.name || "Bộ thẻ";

    switch (screen) {
      case "scheduled":
        return (
          <ScheduledStudy
            cards={scheduledCards}
            title={scheduledBack === "today" ? "Tất cả bộ thẻ" : deckTitle}
            onRate={store.reviewCard}
            onBack={() => setScreen(scheduledBack)}
          />
        );
      case "flashcards":
        return (
          <FlashcardsMode
            cards={deckCards}
            title={deckTitle}
            onBack={() => setScreen("deck")}
            onToggleDifficult={store.toggleDifficult}
            onRate={store.reviewCard}
          />
        );
      case "learn":
        return (
          <LearnMode
            cards={deckCards}
            title={deckTitle}
            onBack={() => setScreen("deck")}
            onBatchReview={store.batchReview}
          />
        );
      case "test":
        return (
          <TestMode
            cards={deckCards}
            title={deckTitle}
            onBack={() => setScreen("deck")}
            onBatchReview={store.batchReview}
          />
        );
      case "match":
        return (
          <MatchMode
            cards={deckCards}
            title={deckTitle}
            onBack={() => setScreen("deck")}
          />
        );
      case "deck":
        return (
          <DeckDetailPanel
            deck={selectedDeck}
            cards={deckCards}
            dueCards={deckDue}
            now={store.now}
            onBack={() => setScreen("library")}
            onMode={setScreen}
            onScheduled={() => startScheduled(deckDue, selectedDeck?.id)}
            onEditCard={setEditingCard}
            onDeleteCard={(id) => void store.removeCard(id)}
            onToggleDifficult={(card) => void store.toggleDifficult(card)}
            onAddCard={() => selectedDeck && setAddingCardToDeck(selectedDeck)}
            onEditDeck={() => selectedDeck && setDeckDialog({ open: true, deck: selectedDeck })}
            onDeleteDeck={() => selectedDeck && setDeletingDeck(selectedDeck)}
            onQuickImport={() => {
              if (selectedDeck) store.setSelectedDeckId(selectedDeck.id);
              setScreen("import");
            }}
          />
        );
      case "import":
        return (
          <ImportPanel
            decks={store.data.decks}
            selectedDeckId={store.selectedDeckId}
            onSelectDeckId={store.setSelectedDeckId}
            ollamaAvailable={store.ollama}
            onSaveCards={handleSaveCards}
            onNotice={showNotice}
          />
        );
      case "library":
        return (
          <LibraryPanel
            data={store.data}
            now={store.now}
            onOpenDeck={openDeck}
            onCreateDeck={() => setDeckDialog({ open: true, deck: null })}
            onEditDeck={(deck) => setDeckDialog({ open: true, deck })}
            onDeleteDeck={setDeletingDeck}
            onAddCard={setAddingCardToDeck}
            onFree={(deck) => {
              store.setSelectedDeckId(deck.id);
              setScreen("flashcards");
            }}
            onDue={(deck) =>
              startScheduled(
                store.data.cards.filter(
                  (card) => card.deckId === deck.id && card.due <= store.now,
                ),
                deck.id,
              )
            }
            onEditCard={setEditingCard}
            onDeleteCard={(id) => void store.removeCard(id)}
            onToggleDifficult={(card) => void store.toggleDifficult(card)}
            onCsv={() =>
              downloadTextFile(
                cardsToCsv(store.data.cards),
                "lexilo-cards.csv",
                "text/csv;charset=utf-8",
              )
            }
            onBackup={() => void store.downloadBackup()}
            onRestore={store.restoreBackupFile}
          />
        );
      case "today":
      default:
        return (
          <TodayPanel
            data={store.data}
            due={due}
            now={store.now}
            todayCount={todayCount}
            week={week}
            onStart={() => startScheduled(due)}
            onLibrary={() => setScreen("library")}
            onOpenDeck={openDeck}
            onFree={(deck) => {
              store.setSelectedDeckId(deck.id);
              setScreen("flashcards");
            }}
            onDue={(deck) =>
              startScheduled(
                store.data.cards.filter(
                  (card) => card.deckId === deck.id && card.due <= store.now,
                ),
                deck.id,
              )
            }
          />
        );
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-[#17233b]">
      <AppHeader
        todayCount={todayCount}
        dueCount={due.length}
        cloudUser={store.cloudUser}
        onGoHome={() => setScreen("today")}
        onOpenSync={() => setSyncDialogOpen(true)}
        onOpenNotifications={() => setNotifDialogOpen(true)}
        onCreateDeck={() => setDeckDialog({ open: true, deck: null })}
        onQuickAddCard={() => selectedDeck && setAddingCardToDeck(selectedDeck)}
      />

      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-5 sm:px-5 sm:py-6 md:grid-cols-[210px_minmax(0,1fr)]">
        <DesktopSidebar
          currentScreen={screen}
          dueCount={due.length}
          cloudUser={store.cloudUser}
          onNavigate={handleNavSelect}
          onOpenSync={() => setSyncDialogOpen(true)}
        />

        <section className="min-w-0">
          {store.ready ? renderActiveScreen() : <LoadingState />}
        </section>
      </div>

      <MobileBottomNav
        currentScreen={screen}
        dueCount={due.length}
        onNavigate={handleNavSelect}
      />

      {editingCard && (
        <EditCardDialog
          key={editingCard.id}
          card={editingCard}
          busy={editCardBusy}
          error={editCardError}
          onClose={() => {
            setEditingCard(null);
            setEditCardError("");
          }}
          onSave={handleSaveEditCard}
        />
      )}

      {addingCardToDeck && (
        <AddCardDialog
          key={addingCardToDeck.id}
          deck={addingCardToDeck}
          busy={addCardBusy}
          error={addCardError}
          onClose={() => {
            setAddingCardToDeck(null);
            setAddCardError("");
          }}
          onSave={handleAddSingleCard}
        />
      )}

      {deckDialog.open && (
        <DeckFormDialog
          key={deckDialog.deck?.id ?? "new-deck"}
          initialDeck={deckDialog.deck}
          busy={deckDialogBusy}
          error={deckDialogError}
          onClose={() => {
            setDeckDialog({ open: false });
            setDeckDialogError("");
          }}
          onSave={handleSaveDeck}
        />
      )}

      {deletingDeck && (
        <DeleteDeckDialog
          deck={deletingDeck}
          cardCount={store.data.cards.filter((c) => c.deckId === deletingDeck.id).length}
          canDelete={store.data.decks.length > 1}
          busy={deleteDeckBusy}
          onClose={() => setDeletingDeck(null)}
          onConfirm={handleDeleteDeck}
        />
      )}

      <CloudSyncDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        currentStore={store.data}
        onStoreUpdated={store.commitState}
        onAuthChanged={() => void store.refreshCloudUser()}
        onNotice={showNotice}
      />

      <NotificationDialog
        open={notifDialogOpen}
        onOpenChange={setNotifDialogOpen}
        dueCount={due.length}
        onNotice={showNotice}
      />

      <NoticeToast notice={notice} />
    </main>
  );
}
