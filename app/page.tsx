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
  Flag,
  Flame,
  GraduationCap,
  Grid2X2,
  LayoutDashboard,
  Layers3,
  Library,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EditCardDialog } from "@/components/lexilo/edit-card-dialog";
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
  const [editing, setEditing] = useState<Card | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      requestJson<Store>("/api/state"),
      requestJson<{ ollama: boolean }>("/api/health"),
    ]).then(([state, health]) => {
      setData(state);
      setOllama(health.ollama);
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

  async function addDeck() {
    if (!deckName.trim()) return;
    try {
      const state = await requestJson<Store>("/api/decks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: deckName }),
      });
      setData(state);
      const created = state.decks.at(-1);
      if (created) setSelectedDeckId(created.id);
      setDeckName("");
      showNotice("success", "Đã tạo bộ thẻ mới.");
    } catch (error) {
      showNotice("error", (error as Error).message);
    }
  }

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
    if (screen === "deck") return <DeckDetail deck={selectedDeck} cards={deckCards} dueCards={deckDue} onBack={() => go("library")} onMode={go} onScheduled={() => startScheduled(deckDue, selectedDeck?.id)} onEdit={setEditing} onDelete={removeCard} onToggleDifficult={toggleDifficult} />;
    if (screen === "import") return <ImportPanel data={data} selectedDeckId={selectedDeckId} setSelectedDeckId={setSelectedDeckId} mode={importMode} setMode={(mode) => { setImportMode(mode); setAiPreview([]); }} bulk={bulk} setBulk={setBulk} aiPreview={aiPreview} setAiPreview={setAiPreview} updatePreview={updatePreview} ollama={ollama} aiBusy={aiBusy} onImport={importCards} onGenerate={generateAiPreview} onSavePreview={saveAiPreview} />;
    if (screen === "library") return <LibraryPanel data={data} deckName={deckName} setDeckName={setDeckName} onAddDeck={addDeck} onOpenDeck={openDeck} onFree={(deck) => { setSelectedDeckId(deck.id); go("flashcards"); }} onDue={(deck) => { const cards = data.cards.filter((card) => card.deckId === deck.id && card.due <= Date.now()); startScheduled(cards, deck.id); }} onEdit={setEditing} onDelete={removeCard} onCsv={() => download(cardsToCsv(data.cards), "lexilo-cards.csv", "text/csv;charset=utf-8")} onBackup={downloadBackup} onRestore={restore} />;
    return <TodayPanel data={data} due={due} week={week} onStart={() => startScheduled(due)} onLibrary={() => go("library")} onOpenDeck={openDeck} onFree={(deck) => { setSelectedDeckId(deck.id); go("flashcards"); }} onDue={(deck) => startScheduled(data.cards.filter((card) => card.deckId === deck.id && card.due <= Date.now()), deck.id)} />;
  })();

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-[#17233b]">
      <header className="sticky top-0 z-20 border-b border-[#e5e8f0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-5">
          <button onClick={() => go("today")} className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#ff6b4a] text-white shadow-[0_8px_22px_#ff6b4a42]"><Brain size={22} /></span><b className="text-xl tracking-tight">Lexilo</b></button>
          <div className="flex gap-2"><span className="hidden items-center gap-1 rounded-full bg-[#fff2ed] px-3 text-sm font-bold text-[#e65332] sm:flex"><Flame size={17} />{todayCount} lượt hôm nay</span><Button onClick={() => go("import")} className="rounded-xl"><Plus />Thêm thẻ</Button></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-5 sm:px-5 sm:py-6 md:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden md:block"><nav className="sticky top-24 space-y-1">{navigation.map(([key, Icon, label]) => <button key={key} onClick={() => key === "scheduled" ? startScheduled(due) : go(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold ${screen === key ? "bg-white text-[#ff5e3a] shadow-sm" : "text-[#667085] hover:bg-white"}`}><Icon size={19} />{label}</button>)}<div className="mt-6 rounded-2xl bg-[#17233b] p-4 text-white"><b className="text-sm">Dữ liệu riêng tư</b><p className="mt-1 text-xs leading-5 text-slate-300">Thẻ, lịch FSRS và đánh dấu Khó được lưu trong SQLite trên máy này.</p></div></nav></aside>
        <section className="min-w-0">{ready ? content : <LoadingState />}</section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t bg-white p-2 md:hidden">{navigation.map(([key, Icon, label]) => <button key={key} onClick={() => key === "scheduled" ? startScheduled(due) : go(key)} className={`flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-bold ${screen === key ? "text-[#ff5e3a]" : "text-slate-400"}`}><Icon size={19} />{label}</button>)}</nav>
      {editing && <EditCardDialog card={editing} busy={editBusy} error={editError} onClose={() => { setEditing(null); setEditError(""); }} onSave={saveEdit} />}
      {notice && <div role="status" className={`fixed bottom-20 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-xl md:bottom-6 ${notice.kind === "success" ? "bg-[#17a673]" : "bg-red-600"}`}>{notice.text}</div>}
    </main>
  );
}

function TodayPanel({ data, due, week, onStart, onLibrary, onOpenDeck, onFree, onDue }: { data: Store; due: Card[]; week: { label: string; count: number }[]; onStart: () => void; onLibrary: () => void; onOpenDeck: (id: string) => void; onFree: (deck: Deck) => void; onDue: (deck: Deck) => void }) {
  return <div className="space-y-6"><div><b className="text-[#ff6b4a]">Chào bạn 👋</b><h1 className="mt-1 text-3xl font-black sm:text-4xl">Hôm nay mình học gì?</h1></div><div className="grid gap-4 sm:grid-cols-3"><Metric icon={CalendarDays} label="Cần ôn hôm nay" value={due.length} color="#ff6b4a" /><Metric icon={Plus} label="Thẻ mới đến hạn" value={due.filter((card) => !card.reps).length} color="#6c63ff" /><Metric icon={BookOpen} label="Đã bắt đầu học" value={data.cards.filter((card) => card.reps).length} color="#17a673" /></div><div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6c63ff] to-[#5248e8] p-6 text-white shadow-xl sm:p-7"><div className="flex justify-between"><div><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">ÔN THEO LỊCH FSRS</span><h2 className="mt-5 text-3xl font-black">{due.length ? `${due.length} thẻ đang chờ` : "Không có thẻ đến hạn"}</h2><p className="mt-2 max-w-md text-sm leading-6 text-indigo-100">Chỉ phiên này mới tự cập nhật lịch khi bạn chọn Quên, Khó, Tốt hoặc Dễ.</p></div><Brain className="hidden opacity-20 sm:block" size={100} /></div><Button onClick={onStart} disabled={!due.length} className="mt-7 h-12 rounded-xl bg-white px-6 font-black text-[#554ceb] hover:bg-indigo-50">Bắt đầu ôn<ChevronRight /></Button></div><div className="rounded-[24px] border bg-white p-6"><b>Nhịp học 7 ngày</b><div className="mt-7 flex h-36 items-end gap-2">{week.map((day, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg" style={{ height: `${Math.max(10, Math.min(100, day.count * 12))}%`, background: day.count ? "#6c63ff" : "#eceef4" }} /><span className="text-xs font-bold text-slate-400">{day.label}</span></div>)}</div></div></div><div><div className="mb-3 flex justify-between"><h2 className="text-xl font-black">Các bộ thẻ</h2><button onClick={onLibrary} className="text-sm font-bold text-[#6258ef]">Xem tất cả</button></div><div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{data.decks.map((deck) => <DeckCard key={deck.id} deck={deck} count={data.cards.filter((card) => card.deckId === deck.id).length} due={data.cards.filter((card) => card.deckId === deck.id && card.due <= Date.now()).length} onOpen={() => onOpenDeck(deck.id)} onFree={() => onFree(deck)} onDue={() => onDue(deck)} />)}</div></div></div>;
}

function LibraryPanel({ data, deckName, setDeckName, onAddDeck, onOpenDeck, onFree, onDue, onEdit, onDelete, onCsv, onBackup, onRestore }: { data: Store; deckName: string; setDeckName: (value: string) => void; onAddDeck: () => void; onOpenDeck: (id: string) => void; onFree: (deck: Deck) => void; onDue: (deck: Deck) => void; onEdit: (card: Card) => void; onDelete: (id: string) => void; onCsv: () => void; onBackup: () => void; onRestore: (file: File) => void }) {
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">Thư viện của bạn</h1><p className="mt-2 text-slate-500">{data.decks.length} bộ thẻ · {data.cards.length} thẻ · SQLite</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onCsv}><Download />CSV</Button><Button variant="outline" onClick={onBackup}><Download />Sao lưu</Button><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-white px-4 text-sm font-medium"><Upload size={16} />Khôi phục<input className="hidden" type="file" accept=".json" onChange={(event) => event.target.files?.[0] && onRestore(event.target.files[0])} /></label></div></div><div className="mt-6 rounded-2xl border bg-white p-4"><div className="flex flex-col gap-2 sm:flex-row"><Input value={deckName} onChange={(event) => setDeckName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAddDeck()} placeholder="Tên bộ thẻ mới..." /><Button onClick={onAddDeck}><Plus />Tạo bộ</Button></div></div><div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{data.decks.map((deck) => <DeckCard key={deck.id} deck={deck} count={data.cards.filter((card) => card.deckId === deck.id).length} due={data.cards.filter((card) => card.deckId === deck.id && card.due <= Date.now()).length} onOpen={() => onOpenDeck(deck.id)} onFree={() => onFree(deck)} onDue={() => onDue(deck)} />)}</div><div className="mt-6 overflow-hidden rounded-2xl border bg-white"><div className="border-b p-4 font-black">Tất cả thẻ</div>{data.cards.length ? data.cards.map((card) => <CardRow key={card.id} card={card} onEdit={() => onEdit(card)} onDelete={() => onDelete(card.id)} />) : <p className="p-8 text-center text-slate-500">Chưa có thẻ nào.</p>}</div></div>;
}

function ImportPanel({ data, selectedDeckId, setSelectedDeckId, mode, setMode, bulk, setBulk, aiPreview, setAiPreview, updatePreview, ollama, aiBusy, onImport, onGenerate, onSavePreview }: { data: Store; selectedDeckId: string; setSelectedDeckId: (id: string) => void; mode: ImportMode; setMode: (mode: ImportMode) => void; bulk: string; setBulk: (value: string) => void; aiPreview: PreviewCard[]; setAiPreview: React.Dispatch<React.SetStateAction<PreviewCard[]>>; updatePreview: (id: string, field: keyof CardDraft, value: string) => void; ollama: boolean; aiBusy: boolean; onImport: () => void; onGenerate: () => void; onSavePreview: () => void }) {
  const count = mode === "pairs" ? parseQuickImport(bulk).length : createClozes(bulk).length;
  return <div className="mx-auto max-w-4xl"><h1 className="text-3xl font-black">Nhập bộ thẻ nhanh</h1><p className="mt-2 text-slate-500">Dán nhiều dòng hoặc nhờ AI local tạo bản xem trước.</p><div className="mt-6 rounded-[26px] border bg-white p-5 shadow-sm sm:p-6"><Tabs value={mode} onValueChange={(value) => setMode(value as ImportMode)}><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="pairs">Từ & nghĩa</TabsTrigger><TabsTrigger value="cloze">Điền khuyết</TabsTrigger><TabsTrigger value="ai">AI local</TabsTrigger></TabsList><TabsContent value="pairs"><p className="my-4 text-sm text-slate-500">Mỗi dòng: <b>English | IPA | Part of speech | Vietnamese meaning | English example</b>. Có thể dùng Tab thay cho dấu |.</p><Textarea value={bulk} onChange={(event) => setBulk(event.target.value)} className="min-h-64 rounded-2xl text-base" placeholder="resilient | /rɪˈzɪliənt/ | adjective | kiên cường | She remained resilient after the setback." /></TabsContent><TabsContent value="cloze"><p className="my-4 text-sm text-slate-500">Dán đoạn văn tiếng Anh. Thẻ điền khuyết sẽ để trống IPA và từ loại.</p><Textarea value={bulk} onChange={(event) => setBulk(event.target.value)} className="min-h-64 rounded-2xl text-base" placeholder="Paste an English paragraph here..." /></TabsContent><TabsContent value="ai"><div className={`my-4 rounded-xl p-3 text-sm font-bold ${ollama ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ollama ? "● Ollama đang kết nối" : "○ Ollama chưa chạy — các chế độ học vẫn hoạt động bình thường"}</div><Textarea value={bulk} onChange={(event) => { setBulk(event.target.value); setAiPreview([]); }} className="min-h-52 rounded-2xl text-base" placeholder="Dán bài đọc hoặc chủ đề. AI sẽ tạo từ, IPA, từ loại, nghĩa và ví dụ để bạn duyệt..." /></TabsContent></Tabs><div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><select value={selectedDeckId} onChange={(event) => setSelectedDeckId(event.target.value)} className="h-11 min-w-0 rounded-xl border bg-white px-3 font-semibold">{data.decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select>{mode === "ai" ? <Button disabled={aiBusy || !bulk.trim()} onClick={onGenerate} className="h-11 rounded-xl bg-[#ff6b4a] px-6 hover:bg-[#eb5737]"><Sparkles />{aiBusy ? "AI đang tạo..." : "Tạo bản xem trước"}</Button> : <Button disabled={!count} onClick={onImport} className="h-11 rounded-xl bg-[#ff6b4a] px-6 hover:bg-[#eb5737]"><Sparkles />Tạo {count} thẻ</Button>}</div></div>{mode === "ai" && aiPreview.length > 0 && <div className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Duyệt kết quả AI</h2><p className="text-sm text-slate-500">Sửa, bỏ chọn hoặc xóa từng thẻ trước khi lưu.</p></div><Button disabled={!aiPreview.some((card) => card.selected)} onClick={onSavePreview}>Lưu {aiPreview.filter((card) => card.selected).length} thẻ đã chọn</Button></div><div className="mt-4 space-y-3">{aiPreview.map((card, index) => <div key={card.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${card.selected ? "" : "opacity-55"}`}><div className="mb-3 flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-black"><input type="checkbox" checked={card.selected} onChange={(event) => setAiPreview((cards) => cards.map((item) => item.id === card.id ? { ...item, selected: event.target.checked } : item))} className="size-4 accent-[#6c63ff]" />Thẻ {index + 1}</label><Button variant="ghost" size="icon" aria-label="Xóa khỏi bản xem trước" onClick={() => setAiPreview((cards) => cards.filter((item) => item.id !== card.id))}><X /></Button></div><div className="grid gap-3 sm:grid-cols-2"><PreviewField label="Front" value={card.front} onChange={(value) => updatePreview(card.id, "front", value)} /><PreviewField label="IPA" value={card.ipa} onChange={(value) => updatePreview(card.id, "ipa", value)} /><PreviewField label="Part of speech" value={card.partOfSpeech} onChange={(value) => updatePreview(card.id, "partOfSpeech", value)} /><PreviewField label="Back" value={card.back} onChange={(value) => updatePreview(card.id, "back", value)} /><label className="grid gap-1 text-xs font-black uppercase text-slate-500 sm:col-span-2">Example<Textarea value={card.example} onChange={(event) => updatePreview(card.id, "example", event.target.value)} /></label></div></div>)}</div></div>}</div>;
}

function DeckDetail({ deck, cards, dueCards, onBack, onMode, onScheduled, onEdit, onDelete, onToggleDifficult }: { deck?: Deck; cards: Card[]; dueCards: Card[]; onBack: () => void; onMode: (screen: Screen) => void; onScheduled: () => void; onEdit: (card: Card) => void; onDelete: (id: string) => void; onToggleDifficult: (card: Card) => void }) {
  if (!deck) return <div className="rounded-2xl border bg-white p-8 text-center">Không tìm thấy bộ thẻ.<Button onClick={onBack} className="mt-4">Quay lại</Button></div>;
  const modes = [
    ["flashcards", Layers3, "Flashcards", "Lật và duyệt toàn bộ thẻ"],
    ["learn", Brain, "Learn", "Trắc nghiệm và gõ đáp án"],
    ["test", FileQuestion, "Test", "Tạo bài kiểm tra tùy chỉnh"],
    ["match", Grid2X2, "Match", "Ghép tối đa sáu cặp"],
  ] as const;
  return <div><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Button variant="outline" size="icon" onClick={onBack}><ChevronLeft /></Button><div><p className="text-sm font-bold" style={{ color: deck.color }}>BỘ THẺ</p><h1 className="text-3xl font-black">{deck.name}</h1><p className="mt-1 text-sm text-slate-500">{cards.length} thẻ · {dueCards.length} đến hạn · {cards.filter((card) => card.isDifficult).length} thẻ khó</p></div></div><Button disabled={!dueCards.length} onClick={onScheduled}><CalendarDays />{dueCards.length ? `Ôn ${dueCards.length} thẻ đến hạn` : "Không có thẻ đến hạn"}</Button></div><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{modes.map(([key, Icon, label, detail]) => <button key={key} disabled={!cards.length} onClick={() => onMode(key)} className="rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-1 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50"><span className="grid size-11 place-items-center rounded-xl bg-[#f0efff] text-[#6258ef]"><Icon /></span><b className="mt-4 block text-lg">{label}</b><span className="mt-1 block text-sm text-slate-500">{detail}</span></button>)}</div>{!cards.length ? <div className="mt-6 rounded-2xl border border-dashed bg-white p-10 text-center"><BookOpen className="mx-auto text-slate-300" size={42} /><h2 className="mt-3 text-xl font-black">Bộ thẻ đang trống</h2><p className="mt-1 text-sm text-slate-500">Hãy thêm thẻ bằng màn hình Nhập nhanh.</p></div> : <div className="mt-6 overflow-hidden rounded-2xl border bg-white"><div className="border-b p-4 font-black">Thẻ trong bộ</div>{cards.map((card) => <div key={card.id} className="grid items-center gap-3 border-b p-4 last:border-0 sm:grid-cols-[1fr_auto]"><CardIdentity card={card} /><div className="flex flex-wrap gap-1"><Button variant="ghost" size="sm" onClick={() => onToggleDifficult(card)} className={card.isDifficult ? "text-amber-700" : "text-slate-500"}><Flag />{card.isDifficult ? "Đã Khó" : "Đánh dấu Khó"}</Button><Button variant="ghost" size="icon" onClick={() => onEdit(card)} aria-label="Sửa thẻ"><Pencil /></Button><Button variant="ghost" size="icon" onClick={() => onDelete(card.id)} className="text-red-500" aria-label="Xóa thẻ"><Trash2 /></Button></div></div>)}</div>}</div>;
}

function DeckCard({ deck, count, due, onOpen, onFree, onDue }: { deck: Deck; count: number; due: number; onOpen: () => void; onFree: () => void; onDue: () => void }) {
  return <article className="rounded-2xl border bg-white p-5 transition hover:shadow-lg"><button onClick={onOpen} className="w-full text-left"><div className="flex justify-between"><span className="grid size-11 place-items-center rounded-xl text-white" style={{ background: deck.color }}><BookOpen size={21} /></span><ChevronRight className="text-slate-300" /></div><h3 className="mt-4 font-black">{deck.name}</h3><p className="mt-1 text-sm text-slate-500">{count} thẻ · <b style={{ color: deck.color }}>{due} đến hạn</b></p></button><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" size="sm" disabled={!count} onClick={onFree}><Layers3 />Học tự do</Button><Button size="sm" disabled={!due} onClick={onDue}><CalendarDays />Ôn {due}</Button></div></article>;
}

function CardRow({ card, onEdit, onDelete }: { card: Card; onEdit: () => void; onDelete: () => void }) {
  return <div className="grid items-center gap-3 border-b p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><button onClick={onEdit} className="min-w-0 text-left hover:text-[#6c63ff]"><CardIdentity card={card} /></button><span className="text-sm text-slate-500 sm:text-base">{card.back}</span><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={onEdit} aria-label="Sửa thẻ"><Pencil /></Button><Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500" aria-label="Xóa thẻ"><Trash2 /></Button></div></div>;
}

function CardIdentity({ card }: { card: Card }) {
  return <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="break-words font-black">{card.front}</span>{card.isDifficult && <Flag size={15} className="fill-amber-400 text-amber-500" />}</div>{card.ipa && <p className="mt-1 text-sm font-semibold text-slate-400">{card.ipa}</p>}{card.partOfSpeech && <span className="mt-1 inline-flex rounded-full bg-[#f0efff] px-2 py-0.5 text-[11px] font-black lowercase text-[#6258ef]">{card.partOfSpeech}</span>}</div>;
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Brain; label: string; value: number; color: string }) {
  return <div className="flex items-center gap-4 rounded-2xl border bg-white p-5"><span className="grid size-12 place-items-center rounded-2xl" style={{ background: `${color}18`, color }}><Icon size={23} /></span><div><b className="block text-2xl">{value}</b><span className="text-sm font-semibold text-slate-500">{label}</span></div></div>;
}

function PreviewField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-black uppercase text-slate-500">{label}<Input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function LoadingState() {
  return <div className="grid min-h-[55vh] place-items-center"><div className="text-center"><span className="mx-auto grid size-14 animate-pulse place-items-center rounded-2xl bg-[#f0efff] text-[#6258ef]"><Brain /></span><p className="mt-3 text-sm font-bold text-slate-500">Đang mở dữ liệu Lexilo...</p></div></div>;
}
