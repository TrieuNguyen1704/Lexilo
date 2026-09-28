"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileQuestion,
  Filter,
  Flag,
  Flame,
  GraduationCap,
  Grid2X2,
  LayoutDashboard,
  Layers3,
  Library,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EditCardDialog } from "@/components/lexilo/edit-card-dialog";
import {
  AddCardDialog,
  DeckDialog,
  DeleteDeckDialog,
} from "@/components/lexilo/deck-dialogs";
import {
  FlashcardsMode,
  LearnMode,
  MatchMode,
  ScheduledStudy,
  TestMode,
} from "@/components/lexilo/learning-modes";
import {
  Card,
  CardDraft,
  cardsToCsv,
  createClozes,
  Deck,
  emptyDraft,
  normalizePartOfSpeech,
  parseQuickImport,
  Rating,
  Store,
} from "@/lib/lexilo";

type Screen = "today" | "library" | "import" | "deck" | "scheduled" | "flashcards" | "learn" | "test" | "match";
type ImportMode = "pairs" | "cloze" | "ai";
type PreviewCard = CardDraft & { id: string; selected: boolean };

const DAY = 86_400_000;
const today = () => new Date().toISOString().slice(0, 10);
const initial: Store = {
  decks: [{ id: "daily", name: "English hằng ngày", color: "#ff6b4a", cardCount: 3, dueCount: 2 }],
  cards: [
    { id: "1", deckId: "daily", front: "resilient", ipa: "/rɪˈzɪliənt/", partOfSpeech: "adjective", back: "kiên cường; có khả năng phục hồi", example: "She remained resilient after the setback.", isDifficult: false, due: Date.now(), interval: 0, reps: 0, lapses: 0 },
    { id: "2", deckId: "daily", front: "figure out", ipa: "/ˈfɪɡər aʊt/", partOfSpeech: "phrasal verb", back: "tìm ra; hiểu ra", example: "I need to figure out how it works.", isDifficult: true, due: Date.now(), interval: 1, reps: 1, lapses: 0 },
    { id: "3", deckId: "daily", front: "I’m interested ___ technology.", ipa: "", partOfSpeech: "", back: "in", example: "I’m interested in technology.", isDifficult: false, due: Date.now() + DAY, interval: 1, reps: 1, lapses: 0 },
  ],
  reviews: [],
};

function speak(card: { front: string }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(card.front);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({ error: "Phản hồi máy chủ không hợp lệ" }));
  if (!response.ok) throw new Error(payload.error || "Không thể hoàn tất yêu cầu");
  return payload as T;
}

export default function Home() {
  const [data, setData] = useState<Store>(initial);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("today");
  const [selectedDeckId, setSelectedDeckId] = useState("daily");
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);
  const [scheduledBack, setScheduledBack] = useState<"today" | "deck">("today");
  const [deckName, setDeckName] = useState("");
  const [bulk, setBulk] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("pairs");
  const [aiPreview, setAiPreview] = useState<PreviewCard[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [ollama, setOllama] = useState(false);

  // Card dialogs
  const [editing, setEditing] = useState<Card | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [addingCardToDeck, setAddingCardToDeck] = useState<Deck | null>(null);
  const [addCardBusy, setAddCardBusy] = useState(false);
  const [addCardError, setAddCardError] = useState("");

  // Deck dialogs
  const [deckDialogState, setDeckDialogState] = useState<{ open: boolean; deck?: Deck | null }>({ open: false });
  const [deckDialogBusy, setDeckDialogBusy] = useState(false);
  const [deckDialogError, setDeckDialogError] = useState("");
  const [deletingDeck, setDeletingDeck] = useState<Deck | null>(null);
  const [deleteDeckBusy, setDeleteDeckBusy] = useState(false);

  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      requestJson<Store>("/api/state"),
      requestJson<{ ollama: boolean }>("/api/health"),
    ]).then(([state, health]) => {
      setData(state);
      setOllama(health.ollama);
      if (state.decks.length > 0 && !state.decks.some((d) => d.id === selectedDeckId)) {
        setSelectedDeckId(state.decks[0].id);
      }
    }).catch((error) => showNotice("error", error.message)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const due = useMemo(() => data.cards.filter((card) => card.due <= Date.now()), [data.cards]);
  const selectedDeck = data.decks.find((deck) => deck.id === selectedDeckId) || data.decks[0];
  const deckCards = useMemo(() => data.cards.filter((card) => card.deckId === selectedDeck?.id), [data.cards, selectedDeck?.id]);
  const deckDue = useMemo(() => deckCards.filter((card) => card.due <= Date.now()), [deckCards]);
  const scheduledCards = data.cards.filter((card) => scheduledIds.includes(card.id));
  const todayCount = data.reviews.filter((review) => review.date === today()).length;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    return { label: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][date.getDay()], count: data.reviews.filter((review) => review.date === key).length };
  });

  function showNotice(kind: "success" | "error", text: string) {
    setNotice({ kind, text });
  }

  function go(screenName: Screen) {
    setScreen(screenName);
  }

  function openDeck(deckId: string) {
    setSelectedDeckId(deckId);
    setScreen("deck");
  }

  function startScheduled(cards: Card[], deckId?: string) {
    if (!cards.length) {
      showNotice("error", "Hiện không có thẻ nào đến hạn trong lựa chọn này.");
      return;
    }
    if (deckId) setSelectedDeckId(deckId);
    setScheduledBack(deckId ? "deck" : "today");
    setScheduledIds(cards.map((card) => card.id));
    setScreen("scheduled");
  }

  // DECK MANAGEMENT: CREATE
  async function handleSaveDeck(deckData: { name: string; color: string }) {
    setDeckDialogBusy(true);
    setDeckDialogError("");
    try {
      if (deckDialogState.deck) {
        // UPDATE DECK
        const state = await requestJson<Store>(`/api/decks/${deckDialogState.deck.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(deckData),
        });
        setData(state);
        setDeckDialogState({ open: false });
        showNotice("success", `Đã cập nhật bộ thẻ "${deckData.name}".`);
      } else {
        // CREATE DECK
        const state = await requestJson<Store>("/api/decks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(deckData),
        });
        setData(state);
        const created = state.decks.at(-1);
        if (created) setSelectedDeckId(created.id);
        setDeckDialogState({ open: false });
        showNotice("success", `Đã tạo bộ thẻ "${deckData.name}".`);
      }
    } catch (error) {
      setDeckDialogError((error as Error).message);
    } finally {
      setDeckDialogBusy(false);
    }
  }

  // DECK MANAGEMENT: DELETE
  async function handleDeleteDeck() {
    if (!deletingDeck) return;
    setDeleteDeckBusy(true);
    try {
      const state = await requestJson<Store>(`/api/decks/${deletingDeck.id}`, {
        method: "DELETE",
      });
      setData(state);
      setDeletingDeck(null);
      if (selectedDeckId === deletingDeck.id) {
        setSelectedDeckId(state.decks[0]?.id || "");
        if (screen === "deck") setScreen("library");
      }
      showNotice("success", `Đã xóa bộ thẻ "${deletingDeck.name}".`);
    } catch (error) {
      showNotice("error", (error as Error).message);
    } finally {
      setDeleteDeckBusy(false);
    }
  }

  // CARD MANAGEMENT: ADD SINGLE CARD
  async function handleAddSingleCard(draft: CardDraft, keepOpen = false): Promise<boolean> {
    if (!addingCardToDeck) return false;
    setAddCardBusy(true);
    setAddCardError("");
    try {
      const state = await requestJson<Store>("/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deckId: addingCardToDeck.id, cards: [draft] }),
      });
      setData(state);
      if (!keepOpen) {
        setAddingCardToDeck(null);
      }
      showNotice("success", `Đã thêm thẻ "${draft.front}".`);
      return true;
    } catch (error) {
      setAddCardError((error as Error).message);
      return false;
    } finally {
      setAddCardBusy(false);
    }
  }

  // CARD MANAGEMENT: BATCH SAVE
  async function saveCards(cards: CardDraft[], message = "Đã lưu thẻ vào thư viện.") {
    if (!cards.length) {
      showNotice("error", "Chưa có thẻ hợp lệ để lưu.");
      return false;
    }
    try {
      const state = await requestJson<Store>("/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deckId: selectedDeckId, cards }),
      });
      setData(state);
      setBulk("");
      setAiPreview([]);
      setScreen("library");
      showNotice("success", message);
      return true;
    } catch (error) {
      showNotice("error", (error as Error).message);
      return false;
    }
  }

  async function importCards() {
    const cards = importMode === "pairs" ? parseQuickImport(bulk) : createClozes(bulk);
    await saveCards(cards);
  }

  async function generateAiPreview() {
    setAiBusy(true);
    setAiPreview([]);
    try {
      const payload = await requestJson<{ cards: CardDraft[] }>("/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: bulk, model: "qwen3.5:2b" }),
      });
      setAiPreview(payload.cards.map((card) => ({ ...card, id: crypto.randomUUID(), selected: true })));
      showNotice("success", "AI đã tạo bản xem trước. Hãy kiểm tra trước khi lưu.");
    } catch (error) {
      showNotice("error", (error as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  async function saveAiPreview() {
    await saveCards(aiPreview.filter((card) => card.selected).map(({ id: _id, selected: _selected, ...card }) => card), "Đã lưu các thẻ AI được chọn.");
  }

  function updatePreview(id: string, field: keyof CardDraft, value: string) {
    setAiPreview((cards) => cards.map((card) => card.id === id ? { ...card, [field]: field === "partOfSpeech" ? normalizePartOfSpeech(value) : value } : card));
  }

  async function saveEdit(draft: CardDraft) {
    if (!editing) return;
    setEditBusy(true);
    setEditError("");
    try {
      const state = await requestJson<Store>(`/api/cards/${editing.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      setData(state);
      setEditing(null);
      showNotice("success", "Đã cập nhật thẻ.");
    } catch (error) {
      setEditError((error as Error).message);
    } finally {
      setEditBusy(false);
    }
  }

  async function removeCard(cardId: string) {
    if (!window.confirm("Bạn muốn xóa thẻ này?")) return;
    try {
      setData(await requestJson<Store>(`/api/cards/${cardId}`, { method: "DELETE" }));
      showNotice("success", "Đã xóa thẻ.");
    } catch (error) {
      showNotice("error", (error as Error).message);
    }
  }

  async function toggleDifficult(card: Card) {
    try {
      setData(await requestJson<Store>(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDifficult: !card.isDifficult }),
      }));
      showNotice("success", card.isDifficult ? "Đã bỏ đánh dấu Khó." : "Đã đánh dấu thẻ Khó.");
    } catch (error) {
      showNotice("error", (error as Error).message);
    }
  }

  async function reviewCard(cardId: string, rating: Rating) {
    try {
      const result = await requestJson<{ state: Store }>("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId, rating }),
      });
      setData(result.state);
    } catch (error) {
      showNotice("error", (error as Error).message);
      throw error;
    }
  }

  async function batchReview(results: { cardId: string; rating: Rating }[]) {
    try {
      const response = await requestJson<{ state: Store }>("/api/reviews/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ results }),
      });
      setData(response.state);
      showNotice("success", "Đã ghi kết quả vào lịch FSRS.");
    } catch (error) {
      showNotice("error", (error as Error).message);
      throw error;
    }
  }

  function download(content: string, name: string, type: string) {
    const blob = new Blob([content], { type });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  async function downloadBackup() {
    try {
      const backup = await requestJson<unknown>("/api/backup");
      download(JSON.stringify(backup, null, 2), "lexilo-backup.json", "application/json");
      showNotice("success", "Đã tạo bản sao lưu đầy đủ.");
    } catch (error) {
      showNotice("error", (error as Error).message);
    }
  }

  function restore(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const backup = JSON.parse(String(reader.result));
        setData(await requestJson<Store>("/api/restore", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(backup),
        }));
        showNotice("success", "Khôi phục dữ liệu thành công.");
      } catch (error) {
        showNotice("error", (error as Error).message || "File sao lưu không hợp lệ.");
      }
    };
    reader.readAsText(file);
  }

  const navigation = [
    ["today", LayoutDashboard, "Hôm nay"],
    ["scheduled", GraduationCap, "Ôn tập"],
    ["library", Library, "Bộ thẻ"],
    ["import", Sparkles, "Nhập nhanh"],
  ] as const;

  const content = (() => {
    if (screen === "scheduled") return <ScheduledStudy cards={scheduledCards} title={scheduledBack === "today" ? "Tất cả bộ thẻ" : selectedDeck?.name || "Bộ thẻ"} onRate={reviewCard} onBack={() => go(scheduledBack)} />;
    if (screen === "flashcards") return <FlashcardsMode cards={deckCards} title={selectedDeck?.name || "Bộ thẻ"} onBack={() => go("deck")} onToggleDifficult={toggleDifficult} onRate={reviewCard} />;
    if (screen === "learn") return <LearnMode cards={deckCards} title={selectedDeck?.name || "Bộ thẻ"} onBack={() => go("deck")} onBatchReview={batchReview} />;
    if (screen === "test") return <TestMode cards={deckCards} title={selectedDeck?.name || "Bộ thẻ"} onBack={() => go("deck")} onBatchReview={batchReview} />;
    if (screen === "match") return <MatchMode cards={deckCards} title={selectedDeck?.name || "Bộ thẻ"} onBack={() => go("deck")} />;
    if (screen === "deck") return (
      <DeckDetail
        deck={selectedDeck}
        cards={deckCards}
        dueCards={deckDue}
        onBack={() => go("library")}
        onMode={go}
        onScheduled={() => startScheduled(deckDue, selectedDeck?.id)}
        onEditCard={setEditing}
        onDeleteCard={removeCard}
        onToggleDifficult={toggleDifficult}
        onAddCard={() => setAddingCardToDeck(selectedDeck)}
        onEditDeck={() => setDeckDialogState({ open: true, deck: selectedDeck })}
        onDeleteDeck={() => setDeletingDeck(selectedDeck)}
        onQuickImport={() => {
          setSelectedDeckId(selectedDeck.id);
          go("import");
        }}
      />
    );
    if (screen === "import") return <ImportPanel data={data} selectedDeckId={selectedDeckId} setSelectedDeckId={setSelectedDeckId} mode={importMode} setMode={(mode) => { setImportMode(mode); setAiPreview([]); }} bulk={bulk} setBulk={setBulk} aiPreview={aiPreview} setAiPreview={setAiPreview} updatePreview={updatePreview} ollama={ollama} aiBusy={aiBusy} onImport={importCards} onGenerate={generateAiPreview} onSavePreview={saveAiPreview} />;
    if (screen === "library") return (
      <LibraryPanel
        data={data}
        onOpenDeck={openDeck}
        onCreateDeck={() => setDeckDialogState({ open: true, deck: null })}
        onEditDeck={(deck) => setDeckDialogState({ open: true, deck })}
        onDeleteDeck={(deck) => setDeletingDeck(deck)}
        onAddCard={(deck) => setAddingCardToDeck(deck)}
        onFree={(deck) => { setSelectedDeckId(deck.id); go("flashcards"); }}
        onDue={(deck) => { const cards = data.cards.filter((card) => card.deckId === deck.id && card.due <= Date.now()); startScheduled(cards, deck.id); }}
        onEditCard={setEditing}
        onDeleteCard={removeCard}
        onToggleDifficult={toggleDifficult}
        onCsv={() => download(cardsToCsv(data.cards), "lexilo-cards.csv", "text/csv;charset=utf-8")}
        onBackup={downloadBackup}
        onRestore={restore}
      />
    );
    return <TodayPanel data={data} due={due} week={week} onStart={() => startScheduled(due)} onLibrary={() => go("library")} onOpenDeck={openDeck} onFree={(deck) => { setSelectedDeckId(deck.id); go("flashcards"); }} onDue={(deck) => startScheduled(data.cards.filter((card) => card.deckId === deck.id && card.due <= Date.now()), deck.id)} />;
  })();

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-[#17233b]">
      <header className="sticky top-0 z-20 border-b border-[#e5e8f0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-5">
          <button onClick={() => go("today")} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#ff6b4a] text-white shadow-[0_8px_22px_#ff6b4a42]">
              <Brain size={22} />
            </span>
            <b className="text-xl tracking-tight">Lexilo</b>
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full bg-[#fff2ed] px-3.5 py-1.5 text-sm font-bold text-[#e65332] sm:flex">
              <Flame size={17} />{todayCount} lượt hôm nay
            </span>
            <Button
              onClick={() => setDeckDialogState({ open: true, deck: null })}
              variant="outline"
              className="rounded-xl hidden sm:inline-flex"
            >
              <Plus size={16} /> Tạo bộ thẻ
            </Button>
            <Button
              onClick={() => setAddingCardToDeck(selectedDeck)}
              className="rounded-xl bg-[#6c63ff] hover:bg-[#5b52f5] text-white font-bold"
            >
              <Plus size={16} /> Thêm thẻ
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-5 sm:px-5 sm:py-6 md:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <nav className="sticky top-24 space-y-1">
            {navigation.map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => key === "scheduled" ? startScheduled(due) : go(key)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold transition ${
                  screen === key ? "bg-white text-[#ff5e3a] shadow-sm" : "text-[#667085] hover:bg-white/80"
                }`}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
            <div className="mt-6 rounded-2xl bg-[#17233b] p-4 text-white shadow-sm">
              <b className="text-sm">Dữ liệu riêng tư</b>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Thẻ, lịch FSRS và đánh dấu Khó được lưu trong SQLite trên máy này.
              </p>
            </div>
          </nav>
        </aside>

        <section className="min-w-0">{ready ? content : <LoadingState />}</section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-white p-2 md:hidden">
        {navigation.map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => key === "scheduled" ? startScheduled(due) : go(key)}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-bold ${
              screen === key ? "text-[#ff5e3a]" : "text-slate-400"
            }`}
          >
            <Icon size={19} />
            {label}
          </button>
        ))}
      </nav>

      {/* Edit Single Card Dialog */}
      {editing && (
        <EditCardDialog
          card={editing}
          busy={editBusy}
          error={editError}
          onClose={() => { setEditing(null); setEditError(""); }}
          onSave={saveEdit}
        />
      )}

      {/* Quick Add Single Card to Deck */}
      {addingCardToDeck && (
        <AddCardDialog
          deck={addingCardToDeck}
          busy={addCardBusy}
          error={addCardError}
          onClose={() => { setAddingCardToDeck(null); setAddCardError(""); }}
          onSave={handleAddSingleCard}
        />
      )}

      {/* Create / Edit Deck Dialog */}
      {deckDialogState.open && (
        <DeckDialog
          initialDeck={deckDialogState.deck}
          busy={deckDialogBusy}
          error={deckDialogError}
          onClose={() => { setDeckDialogState({ open: false }); setDeckDialogError(""); }}
          onSave={handleSaveDeck}
        />
      )}

      {/* Delete Deck Dialog */}
      {deletingDeck && (
        <DeleteDeckDialog
          deck={deletingDeck}
          cardCount={data.cards.filter((c) => c.deckId === deletingDeck.id).length}
          canDelete={data.decks.length > 1}
          busy={deleteDeckBusy}
          onClose={() => setDeletingDeck(null)}
          onConfirm={handleDeleteDeck}
        />
      )}

      {/* Notice Toast */}
      {notice && (
        <div
          role="status"
          className={`fixed bottom-20 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-xl md:bottom-6 ${
            notice.kind === "success" ? "bg-[#17a673]" : "bg-red-600"
          }`}
        >
          {notice.text}
        </div>
      )}
    </main>
  );
}

function TodayPanel({
  data,
  due,
  week,
  onStart,
  onLibrary,
  onOpenDeck,
  onFree,
  onDue,
}: {
  data: Store;
  due: Card[];
  week: { label: string; count: number }[];
  onStart: () => void;
  onLibrary: () => void;
  onOpenDeck: (id: string) => void;
  onFree: (deck: Deck) => void;
  onDue: (deck: Deck) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <b className="text-[#ff6b4a]">Chào bạn 👋</b>
        <h1 className="mt-1 text-3xl font-black sm:text-4xl">Hôm nay mình học gì?</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric icon={CalendarDays} label="Cần ôn hôm nay" value={due.length} color="#ff6b4a" />
        <Metric icon={Plus} label="Thẻ mới đến hạn" value={due.filter((card) => !card.reps).length} color="#6c63ff" />
        <Metric icon={BookOpen} label="Đã bắt đầu học" value={data.cards.filter((card) => card.reps).length} color="#17a673" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6c63ff] to-[#5248e8] p-6 text-white shadow-xl sm:p-7">
          <div className="flex justify-between">
            <div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">ÔN THEO LỊCH FSRS</span>
              <h2 className="mt-5 text-3xl font-black">{due.length ? `${due.length} thẻ đang chờ` : "Không có thẻ đến hạn"}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-indigo-100">
                Chỉ phiên này mới tự cập nhật lịch khi bạn chọn Quên, Khó, Tốt hoặc Dễ.
              </p>
            </div>
            <Brain className="hidden opacity-20 sm:block" size={100} />
          </div>
          <Button
            onClick={onStart}
            disabled={!due.length}
            className="mt-7 h-12 rounded-xl bg-white px-6 font-black text-[#554ceb] hover:bg-indigo-50"
          >
            Bắt đầu ôn <ChevronRight />
          </Button>
        </div>

        <div className="rounded-[24px] border bg-white p-6">
          <b>Nhịp học 7 ngày</b>
          <div className="mt-7 flex h-36 items-end gap-2">
            {week.map((day, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max(10, Math.min(100, day.count * 12))}%`,
                    background: day.count ? "#6c63ff" : "#eceef4",
                  }}
                />
                <span className="text-xs font-bold text-slate-400">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex justify-between items-center">
          <h2 className="text-xl font-black">Các bộ thẻ</h2>
          <button onClick={onLibrary} className="text-sm font-bold text-[#6258ef] hover:underline">
            Xem tất cả ({data.decks.length})
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {data.decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              count={data.cards.filter((card) => card.deckId === deck.id).length}
              due={data.cards.filter((card) => card.deckId === deck.id && card.due <= Date.now()).length}
              onOpen={() => onOpenDeck(deck.id)}
              onFree={() => onFree(deck)}
              onDue={() => onDue(deck)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LibraryPanel({
  data,
  onOpenDeck,
  onCreateDeck,
  onEditDeck,
  onDeleteDeck,
  onAddCard,
  onFree,
  onDue,
  onEditCard,
  onDeleteCard,
  onToggleDifficult,
  onCsv,
  onBackup,
  onRestore,
}: {
  data: Store;
  onOpenDeck: (id: string) => void;
  onCreateDeck: () => void;
  onEditDeck: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
  onAddCard: (deck: Deck) => void;
  onFree: (deck: Deck) => void;
  onDue: (deck: Deck) => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onToggleDifficult: (card: Card) => void;
  onCsv: () => void;
  onBackup: () => void;
  onRestore: (file: File) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedDeckFilter, setSelectedDeckFilter] = useState("all");

  const filteredCards = useMemo(() => {
    return data.cards.filter((card) => {
      if (selectedDeckFilter !== "all" && card.deckId !== selectedDeckFilter) return false;
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return (
        card.front.toLowerCase().includes(query) ||
        card.back.toLowerCase().includes(query) ||
        card.example.toLowerCase().includes(query)
      );
    });
  }, [data.cards, search, selectedDeckFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Thư viện của bạn</h1>
          <p className="mt-1 text-slate-500">
            {data.decks.length} bộ thẻ · {data.cards.length} thẻ · SQLite lưu trữ cục bộ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onCreateDeck}
            className="rounded-xl bg-[#6c63ff] hover:bg-[#5b52f5] text-white font-bold"
          >
            <Plus size={16} /> Tạo bộ thẻ mới
          </Button>
          <Button variant="outline" onClick={onCsv} className="rounded-xl">
            <Download size={15} /> CSV
          </Button>
          <Button variant="outline" onClick={onBackup} className="rounded-xl">
            <Download size={15} /> Sao lưu
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3.5 text-sm font-semibold hover:bg-slate-50">
            <Upload size={15} /> Khôi phục
            <input
              className="hidden"
              type="file"
              accept=".json"
              onChange={(event) => event.target.files?.[0] && onRestore(event.target.files[0])}
            />
          </label>
        </div>
      </div>

      {/* Decks Grid with complete CRUD operations */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">Danh sách bộ thẻ</h2>
          <span className="text-xs font-bold text-slate-400">{data.decks.length} bộ thẻ</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.decks.map((deck) => {
            const count = data.cards.filter((card) => card.deckId === deck.id).length;
            const dueCount = data.cards.filter((card) => card.deckId === deck.id && card.due <= Date.now()).length;
            const hardCount = data.cards.filter((card) => card.deckId === deck.id && card.isDifficult).length;
            return (
              <article
                key={deck.id}
                className="group relative rounded-2xl border bg-white p-5 transition hover:shadow-lg hover:border-slate-300"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="grid size-11 place-items-center rounded-2xl text-white shadow-sm font-black"
                    style={{ background: deck.color }}
                  >
                    <BookOpen size={20} />
                  </span>

                  {/* Actions: Edit & Delete Deck */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-slate-400 hover:text-slate-800"
                      onClick={() => onEditDeck(deck)}
                      title="Chỉnh sửa bộ thẻ"
                      aria-label="Sửa bộ thẻ"
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-slate-400 hover:text-red-600"
                      onClick={() => onDeleteDeck(deck)}
                      title="Xóa bộ thẻ"
                      aria-label="Xóa bộ thẻ"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>

                <button onClick={() => onOpenDeck(deck.id)} className="w-full text-left mt-3">
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-[#6c63ff] transition-colors">
                    {deck.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    <span>{count} thẻ</span>
                    <span>·</span>
                    <b style={{ color: deck.color }}>{dueCount} đến hạn</b>
                    {hardCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-amber-600 font-bold">{hardCount} thẻ khó</span>
                      </>
                    )}
                  </div>
                </button>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" disabled={!count} onClick={() => onFree(deck)} className="rounded-xl">
                    <Layers3 size={15} /> Học tự do
                  </Button>
                  <Button
                    size="sm"
                    disabled={!dueCount}
                    onClick={() => onDue(deck)}
                    className="rounded-xl text-white font-bold"
                    style={{ backgroundColor: dueCount ? deck.color : undefined }}
                  >
                    <CalendarDays size={15} /> Ôn {dueCount}
                  </Button>
                </div>

                <div className="mt-2 text-center">
                  <button
                    onClick={() => onAddCard(deck)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#6c63ff] py-1"
                  >
                    <Plus size={13} /> Thêm thẻ vào bộ này
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Cards Table with Search and Filtering */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-2xs">
        <div className="border-b p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Tất cả thẻ trong thư viện</h2>
              <p className="text-xs font-semibold text-slate-500">
                Hiển thị {filteredCards.length} / {data.cards.length} thẻ
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm từ vựng, nghĩa..."
                  className="h-9 pl-9 pr-3 rounded-xl text-sm"
                />
              </div>

              <select
                value={selectedDeckFilter}
                onChange={(e) => setSelectedDeckFilter(e.target.value)}
                className="h-9 rounded-xl border bg-white px-3 text-xs font-bold text-slate-700"
              >
                <option value="all">Tất cả bộ thẻ</option>
                {data.decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredCards.length ? (
          <div>
            {filteredCards.map((card) => {
              const deck = data.decks.find((d) => d.id === card.deckId);
              return (
                <div
                  key={card.id}
                  className="grid items-center gap-3 border-b p-4 last:border-0 hover:bg-slate-50/60 transition sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto]"
                >
                  <button onClick={() => onEditCard(card)} className="min-w-0 text-left hover:text-[#6c63ff]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words font-black text-slate-900">{card.front}</span>
                      {deck && (
                        <span
                          className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: deck.color }}
                        >
                          {deck.name}
                        </span>
                      )}
                      {card.isDifficult && <Flag size={14} className="fill-amber-400 text-amber-500" />}
                    </div>
                    {card.ipa && <p className="mt-0.5 text-xs font-semibold text-slate-400">{card.ipa}</p>}
                    {card.partOfSpeech && (
                      <span className="mt-1 inline-flex rounded-full bg-[#f0efff] px-2 py-0.5 text-[10px] font-black lowercase text-[#6258ef]">
                        {card.partOfSpeech}
                      </span>
                    )}
                  </button>

                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-700 sm:text-base">{card.back}</span>
                    {card.example && (
                      <p className="mt-1 text-xs italic text-slate-400 truncate">“{card.example}”</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-slate-400 hover:text-slate-700"
                      onClick={() => speak(card)}
                      aria-label="Phát âm"
                      title="Nghe phát âm"
                    >
                      <Volume2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-slate-400 hover:text-amber-600"
                      onClick={() => onToggleDifficult(card)}
                      aria-label="Đánh dấu khó"
                      title={card.isDifficult ? "Bỏ đánh dấu khó" : "Đánh dấu thẻ khó"}
                    >
                      <Flag size={16} className={card.isDifficult ? "fill-amber-400 text-amber-500" : ""} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-slate-400 hover:text-slate-800"
                      onClick={() => onEditCard(card)}
                      aria-label="Sửa thẻ"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-slate-400 hover:text-red-500"
                      onClick={() => onDeleteCard(card.id)}
                      aria-label="Xóa thẻ"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            {search ? "Không tìm thấy thẻ phù hợp với từ khóa." : "Chưa có thẻ nào."}
          </div>
        )}
      </div>
    </div>
  );
}

function DeckDetail({
  deck,
  cards,
  dueCards,
  onBack,
  onMode,
  onScheduled,
  onEditCard,
  onDeleteCard,
  onToggleDifficult,
  onAddCard,
  onEditDeck,
  onDeleteDeck,
  onQuickImport,
}: {
  deck?: Deck;
  cards: Card[];
  dueCards: Card[];
  onBack: () => void;
  onMode: (screen: Screen) => void;
  onScheduled: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onToggleDifficult: (card: Card) => void;
  onAddCard: () => void;
  onEditDeck: () => void;
  onDeleteDeck: () => void;
  onQuickImport: () => void;
}) {
  const [filterMode, setFilterMode] = useState<"all" | "due" | "hard">("all");
  const [search, setSearch] = useState("");

  if (!deck) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <p className="font-bold text-slate-600">Không tìm thấy bộ thẻ.</p>
        <Button onClick={onBack} className="mt-4 rounded-xl">
          Quay lại
        </Button>
      </div>
    );
  }

  const modes = [
    ["flashcards", Layers3, "Flashcards", "Lật và duyệt thẻ như Quizlet"],
    ["learn", Brain, "Learn", "Trắc nghiệm & gõ từ vựng"],
    ["test", FileQuestion, "Test", "Làm bài kiểm tra tổng hợp"],
    ["match", Grid2X2, "Match", "Trò chơi ghép cặp từ"],
  ] as const;

  const hardCards = cards.filter((c) => c.isDifficult);

  const displayedCards = cards.filter((card) => {
    if (filterMode === "due" && card.due > Date.now()) return false;
    if (filterMode === "hard" && !card.isDifficult) return false;
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      card.front.toLowerCase().includes(query) ||
      card.back.toLowerCase().includes(query) ||
      card.example.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header with full Deck actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl">
            <ChevronLeft />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full inline-block"
                style={{ backgroundColor: deck.color }}
              />
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: deck.color }}>
                BỘ THẺ
              </p>
            </div>
            <h1 className="text-3xl font-black text-slate-900">{deck.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {cards.length} thẻ · {dueCards.length} đến hạn · {hardCards.length} thẻ khó
            </p>
          </div>
        </div>

        {/* Deck Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onAddCard}
            className="rounded-xl bg-[#6c63ff] hover:bg-[#5b52f5] text-white font-bold"
          >
            <Plus size={16} /> Thêm thẻ mới
          </Button>
          <Button
            onClick={onScheduled}
            disabled={!dueCards.length}
            className="rounded-xl font-bold text-white"
            style={{ backgroundColor: dueCards.length ? deck.color : undefined }}
          >
            <CalendarDays size={16} />
            {dueCards.length ? `Ôn ${dueCards.length} thẻ` : "0 thẻ đến hạn"}
          </Button>
          <Button
            variant="outline"
            onClick={onEditDeck}
            className="rounded-xl font-semibold"
            title="Chỉnh sửa tên và màu sắc bộ thẻ"
          >
            <Pencil size={15} /> Sửa bộ
          </Button>
          <Button
            variant="outline"
            onClick={onDeleteDeck}
            className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            title="Xóa bộ thẻ này"
          >
            <Trash2 size={15} /> Xóa bộ
          </Button>
          <Button variant="ghost" onClick={onQuickImport} className="rounded-xl text-slate-600">
            <Sparkles size={15} /> Nhập nhanh
          </Button>
        </div>
      </div>

      {/* 4 Study Modes */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {modes.map(([key, Icon, label, detail]) => (
          <button
            key={key}
            disabled={!cards.length}
            onClick={() => onMode(key)}
            className="group rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-1 hover:shadow-lg hover:border-[#6c63ff]/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[#f0efff] text-[#6258ef] group-hover:bg-[#6258ef] group-hover:text-white transition-colors">
              <Icon size={22} />
            </span>
            <b className="mt-4 block text-lg font-black">{label}</b>
            <span className="mt-1 block text-sm text-slate-500">{detail}</span>
          </button>
        ))}
      </div>

      {/* Cards in Deck Section */}
      {!cards.length ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <BookOpen className="mx-auto text-slate-300" size={44} />
          <h2 className="mt-3 text-xl font-black">Bộ thẻ đang trống</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bạn có thể thêm từng thẻ bằng nút "Thêm thẻ mới" hoặc dán danh sách bằng "Nhập nhanh".
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={onAddCard} className="rounded-xl bg-[#6c63ff] hover:bg-[#5b52f5]">
              <Plus size={16} /> Thêm thẻ ngay
            </Button>
            <Button variant="outline" onClick={onQuickImport} className="rounded-xl">
              <Sparkles size={16} /> Nhập nhiều thẻ
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white shadow-2xs">
          {/* Filter & Search Bar */}
          <div className="border-b p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={filterMode === "all" ? "default" : "outline"}
                  onClick={() => setFilterMode("all")}
                  className="rounded-xl text-xs font-bold"
                >
                  Tất cả ({cards.length})
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === "due" ? "default" : "outline"}
                  onClick={() => setFilterMode("due")}
                  className="rounded-xl text-xs font-bold"
                >
                  Cần ôn ({dueCards.length})
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === "hard" ? "default" : "outline"}
                  onClick={() => setFilterMode("hard")}
                  className="rounded-xl text-xs font-bold"
                >
                  Thẻ khó ({hardCards.length})
                </Button>
              </div>

              <div className="relative min-w-56">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Lọc từ vựng trong bộ..."
                  className="h-9 pl-9 pr-3 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Cards List */}
          <div>
            {displayedCards.map((card) => (
              <div
                key={card.id}
                className="grid items-center gap-3 border-b p-4 last:border-0 hover:bg-slate-50/60 transition sm:grid-cols-[1fr_auto]"
              >
                <CardIdentity card={card} />

                <div className="flex flex-wrap items-center gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speak(card)}
                    className="rounded-xl text-slate-500 hover:text-slate-800"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleDifficult(card)}
                    className={`rounded-xl ${card.isDifficult ? "text-amber-700 bg-amber-50" : "text-slate-500"}`}
                  >
                    <Flag size={14} className={card.isDifficult ? "fill-amber-400 text-amber-500" : ""} />
                    {card.isDifficult ? "Đã Khó" : "Đánh dấu Khó"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditCard(card)}
                    aria-label="Sửa thẻ"
                    className="size-8 text-slate-500 hover:text-slate-800 rounded-xl"
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteCard(card.id)}
                    className="size-8 text-red-500 hover:text-red-700 rounded-xl"
                    aria-label="Xóa thẻ"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}

            {!displayedCards.length && (
              <p className="p-8 text-center text-sm font-semibold text-slate-400">
                Không tìm thấy thẻ nào theo bộ lọc.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DeckCard({
  deck,
  count,
  due,
  onOpen,
  onFree,
  onDue,
}: {
  deck: Deck;
  count: number;
  due: number;
  onOpen: () => void;
  onFree: () => void;
  onDue: () => void;
}) {
  return (
    <article className="rounded-2xl border bg-white p-5 transition hover:shadow-lg hover:border-slate-300">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex justify-between">
          <span className="grid size-11 place-items-center rounded-xl text-white font-black" style={{ background: deck.color }}>
            <BookOpen size={21} />
          </span>
          <ChevronRight className="text-slate-300" />
        </div>
        <h3 className="mt-4 font-black text-slate-900">{deck.name}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {count} thẻ · <b style={{ color: deck.color }}>{due} đến hạn</b>
        </p>
      </button>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" disabled={!count} onClick={onFree} className="rounded-xl">
          <Layers3 size={15} /> Học tự do
        </Button>
        <Button
          size="sm"
          disabled={!due}
          onClick={onDue}
          className="rounded-xl text-white font-bold"
          style={{ backgroundColor: due ? deck.color : undefined }}
        >
          <CalendarDays size={15} /> Ôn {due}
        </Button>
      </div>
    </article>
  );
}

function CardIdentity({ card }: { card: Card }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-words font-black text-slate-900">{card.front}</span>
        {card.isDifficult && <Flag size={14} className="fill-amber-400 text-amber-500" />}
      </div>
      {card.ipa && <p className="mt-0.5 text-xs font-semibold text-slate-400">{card.ipa}</p>}
      {card.partOfSpeech && (
        <span className="mt-1 inline-flex rounded-full bg-[#f0efff] px-2 py-0.5 text-[11px] font-black lowercase text-[#6258ef]">
          {card.partOfSpeech}
        </span>
      )}
      <p className="mt-1.5 text-sm font-semibold text-slate-700">{card.back}</p>
      {card.example && <p className="mt-1 text-xs italic text-slate-500">“{card.example}”</p>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Brain; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-white p-5">
      <span className="grid size-12 place-items-center rounded-2xl" style={{ background: `${color}18`, color }}>
        <Icon size={23} />
      </span>
      <div>
        <b className="block text-2xl font-black">{value}</b>
        <span className="text-sm font-semibold text-slate-500">{label}</span>
      </div>
    </div>
  );
}

function PreviewField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
      {label}
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl" />
    </label>
  );
}

function ImportPanel({
  data,
  selectedDeckId,
  setSelectedDeckId,
  mode,
  setMode,
  bulk,
  setBulk,
  aiPreview,
  setAiPreview,
  updatePreview,
  ollama,
  aiBusy,
  onImport,
  onGenerate,
  onSavePreview,
}: {
  data: Store;
  selectedDeckId: string;
  setSelectedDeckId: (id: string) => void;
  mode: ImportMode;
  setMode: (mode: ImportMode) => void;
  bulk: string;
  setBulk: (value: string) => void;
  aiPreview: PreviewCard[];
  setAiPreview: React.Dispatch<React.SetStateAction<PreviewCard[]>>;
  updatePreview: (id: string, field: keyof CardDraft, value: string) => void;
  ollama: boolean;
  aiBusy: boolean;
  onImport: () => void;
  onGenerate: () => void;
  onSavePreview: () => void;
}) {
  const count = mode === "pairs" ? parseQuickImport(bulk).length : createClozes(bulk).length;
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-black">Nhập bộ thẻ nhanh</h1>
      <p className="mt-2 text-slate-500">Dán nhiều dòng hoặc nhờ AI local tạo bản xem trước.</p>
      <div className="mt-6 rounded-[26px] border bg-white p-5 shadow-sm sm:p-6">
        <Tabs value={mode} onValueChange={(value) => setMode(value as ImportMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pairs">Từ & nghĩa</TabsTrigger>
            <TabsTrigger value="cloze">Điền khuyết</TabsTrigger>
            <TabsTrigger value="ai">AI local</TabsTrigger>
          </TabsList>
          <TabsContent value="pairs">
            <p className="my-4 text-sm text-slate-500">
              Mỗi dòng: <b>English | IPA | Part of speech | Vietnamese meaning | English example</b>. Có thể dùng Tab thay cho dấu |.
            </p>
            <Textarea
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              className="min-h-64 rounded-2xl text-base"
              placeholder="resilient | /rɪˈzɪliənt/ | adjective | kiên cường | She remained resilient after the setback."
            />
          </TabsContent>
          <TabsContent value="cloze">
            <p className="my-4 text-sm text-slate-500">Dán đoạn văn tiếng Anh. Thẻ điền khuyết sẽ để trống IPA và từ loại.</p>
            <Textarea
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              className="min-h-64 rounded-2xl text-base"
              placeholder="Paste an English paragraph here..."
            />
          </TabsContent>
          <TabsContent value="ai">
            <div className={`my-4 rounded-xl p-3 text-sm font-bold ${ollama ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {ollama ? "● Ollama đang kết nối" : "○ Ollama chưa chạy — các chế độ học vẫn hoạt động bình thường"}
            </div>
            <Textarea
              value={bulk}
              onChange={(event) => { setBulk(event.target.value); setAiPreview([]); }}
              className="min-h-52 rounded-2xl text-base"
              placeholder="Dán bài đọc hoặc chủ đề. AI sẽ tạo từ, IPA, từ loại, nghĩa và ví dụ để bạn duyệt..."
            />
          </TabsContent>
        </Tabs>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={selectedDeckId}
            onChange={(event) => setSelectedDeckId(event.target.value)}
            className="h-11 min-w-0 rounded-xl border bg-white px-3 font-semibold"
          >
            {data.decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          {mode === "ai" ? (
            <Button
              disabled={aiBusy || !bulk.trim()}
              onClick={onGenerate}
              className="h-11 rounded-xl bg-[#ff6b4a] px-6 hover:bg-[#eb5737] font-bold text-white"
            >
              <Sparkles />{aiBusy ? "AI đang tạo..." : "Tạo bản xem trước"}
            </Button>
          ) : (
            <Button
              disabled={!count}
              onClick={onImport}
              className="h-11 rounded-xl bg-[#ff6b4a] px-6 hover:bg-[#eb5737] font-bold text-white"
            >
              <Sparkles />Tạo {count} thẻ
            </Button>
          )}
        </div>
      </div>
      {mode === "ai" && aiPreview.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Duyệt kết quả AI</h2>
              <p className="text-sm text-slate-500">Sửa, bỏ chọn hoặc xóa từng thẻ trước khi lưu.</p>
            </div>
            <Button
              disabled={!aiPreview.some((card) => card.selected)}
              onClick={onSavePreview}
              className="rounded-xl font-bold"
            >
              Lưu {aiPreview.filter((card) => card.selected).length} thẻ đã chọn
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {aiPreview.map((card, index) => (
              <div
                key={card.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm ${card.selected ? "" : "opacity-55"}`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-black">
                    <input
                      type="checkbox"
                      checked={card.selected}
                      onChange={(event) => setAiPreview((cards) => cards.map((item) => item.id === card.id ? { ...item, selected: event.target.checked } : item))}
                      className="size-4 accent-[#6c63ff]"
                    />
                    Thẻ {index + 1}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xóa khỏi bản xem trước"
                    onClick={() => setAiPreview((cards) => cards.filter((item) => item.id !== card.id))}
                  >
                    <X />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PreviewField label="Front" value={card.front} onChange={(value) => updatePreview(card.id, "front", value)} />
                  <PreviewField label="IPA" value={card.ipa} onChange={(value) => updatePreview(card.id, "ipa", value)} />
                  <PreviewField label="Part of speech" value={card.partOfSpeech} onChange={(value) => updatePreview(card.id, "partOfSpeech", value)} />
                  <PreviewField label="Back" value={card.back} onChange={(value) => updatePreview(card.id, "back", value)} />
                  <label className="grid gap-1 text-xs font-black uppercase text-slate-500 sm:col-span-2">
                    Example
                    <Textarea value={card.example} onChange={(event) => updatePreview(card.id, "example", event.target.value)} className="rounded-xl" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <div className="text-center">
        <span className="mx-auto grid size-14 animate-pulse place-items-center rounded-2xl bg-[#f0efff] text-[#6258ef]">
          <Brain size={28} />
        </span>
        <p className="mt-3 text-sm font-bold text-slate-500">Đang mở dữ liệu Lexilo...</p>
      </div>
    </div>
  );
}
