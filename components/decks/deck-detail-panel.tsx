"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  CalendarDays,
  ChevronLeft,
  FileQuestion,
  Grid2X2,
  Layers3,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterCards } from "@/lib/domain/cards";
import type { Card, Deck } from "@/types/lexilo";
import type { Screen } from "@/types/navigation";
import { CardListItem } from "./card-list-item";

interface DeckDetailPanelProps {
  deck?: Deck;
  cards: Card[];
  dueCards: Card[];
  now: number;
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
}

const STUDY_MODES = [
  { key: "flashcards", icon: Layers3, label: "Flashcards", detail: "Lật và duyệt thẻ như Quizlet" },
  { key: "learn", icon: Brain, label: "Learn", detail: "Trắc nghiệm & gõ từ vựng" },
  { key: "test", icon: FileQuestion, label: "Test", detail: "Làm bài kiểm tra tổng hợp" },
  { key: "match", icon: Grid2X2, label: "Match", detail: "Trò chơi ghép cặp từ" },
] as const;

export function DeckDetailPanel({
  deck,
  cards,
  dueCards,
  now,
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
}: DeckDetailPanelProps) {
  const [filterMode, setFilterMode] = useState<"all" | "due" | "hard">("all");
  const [search, setSearch] = useState("");

  const hardCount = useMemo(() => cards.filter((c) => c.isDifficult).length, [cards]);

  const displayedCards = useMemo(
    () => filterCards(cards, { scope: filterMode, search, now }),
    [cards, filterMode, search, now],
  );

  if (!deck) {
    return (
      <div className="clay-card rounded-3xl p-8 text-center">
        <p className="font-bold text-slate-600">Không tìm thấy bộ thẻ.</p>
        <Button onClick={onBack} className="mt-4 rounded-2xl bg-[#7c3aed] font-bold text-white">
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            aria-label="Quay lại thư viện"
            className="tap-press size-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white shadow-[var(--clay-shadow-soft)]"
          >
            <ChevronLeft />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: deck.color }}
              />
              <p className="text-xs font-extrabold tracking-wider uppercase" style={{ color: deck.color }}>
                Bộ thẻ
              </p>
            </div>
            <h1 className="font-display text-3xl font-bold text-slate-900">{deck.name}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {cards.length} thẻ · {dueCards.length} đến hạn · {hardCount} thẻ khó
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onAddCard}
            className="clay-cta h-10 rounded-2xl bg-[#7c3aed] px-4 font-bold text-white hover:bg-[#6d28d9]"
          >
            <Plus size={16} strokeWidth={2.5} /> Thêm thẻ mới
          </Button>
          <Button
            onClick={onScheduled}
            disabled={!dueCards.length}
            className="clay-cta h-10 rounded-2xl px-4 font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: dueCards.length ? deck.color : undefined }}
          >
            <CalendarDays size={16} />
            {dueCards.length ? `Ôn ${dueCards.length} thẻ` : "0 thẻ đến hạn"}
          </Button>
          <Button
            variant="outline"
            onClick={onEditDeck}
            className="tap-press h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white font-bold text-slate-700"
            title="Chỉnh sửa tên và màu sắc bộ thẻ"
          >
            <Pencil size={15} /> Sửa bộ
          </Button>
          <Button
            variant="outline"
            onClick={onDeleteDeck}
            className="tap-press h-10 rounded-2xl border-red-200 bg-white font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
            title="Xóa bộ thẻ này"
          >
            <Trash2 size={15} /> Xóa bộ
          </Button>
          <Button
            variant="ghost"
            onClick={onQuickImport}
            className="tap-press h-10 rounded-2xl font-bold text-[#6d28d9] hover:bg-violet-50"
          >
            <Sparkles size={15} /> Nhập nhanh
          </Button>
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {STUDY_MODES.map(({ key, icon: Icon, label, detail }) => (
          <button
            key={key}
            disabled={!cards.length}
            onClick={() => onMode(key)}
            className="clay-card-interactive group rounded-3xl p-5 text-left disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-violet-100 text-[#6d28d9] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.8)] transition-colors group-hover:bg-[#7c3aed] group-hover:text-white">
              <Icon size={22} />
            </span>
            <b className="font-display mt-4 block text-lg font-bold text-slate-900">{label}</b>
            <span className="mt-1 block text-xs leading-relaxed font-semibold text-slate-600">
              {detail}
            </span>
          </button>
        ))}
      </div>

      {!cards.length ? (
        <div className="clay-card rounded-3xl border-dashed p-10 text-center">
          <BookOpen className="mx-auto text-violet-300" size={44} />
          <h2 className="font-display mt-3 text-xl font-bold text-slate-900">Bộ thẻ đang trống</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Bạn có thể thêm từng thẻ bằng nút &ldquo;Thêm thẻ mới&rdquo; hoặc dán danh sách bằng
            &ldquo;Nhập nhanh&rdquo;.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button
              onClick={onAddCard}
              className="clay-cta h-10 rounded-2xl bg-[#7c3aed] px-4 font-bold text-white hover:bg-[#6d28d9]"
            >
              <Plus size={16} /> Thêm thẻ ngay
            </Button>
            <Button
              variant="outline"
              onClick={onQuickImport}
              className="tap-press h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white font-bold"
            >
              <Sparkles size={16} /> Nhập nhiều thẻ
            </Button>
          </div>
        </div>
      ) : (
        <div className="clay-card overflow-hidden rounded-3xl">
          <div className="border-b border-[var(--border)] bg-[#fdfbff] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={filterMode === "all" ? "default" : "outline"}
                  onClick={() => setFilterMode("all")}
                  className={`h-9 rounded-2xl px-3.5 text-xs font-extrabold ${
                    filterMode === "all"
                      ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                      : "border-[var(--border)] bg-white text-slate-700"
                  }`}
                >
                  Tất cả ({cards.length})
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === "due" ? "default" : "outline"}
                  onClick={() => setFilterMode("due")}
                  className={`h-9 rounded-2xl px-3.5 text-xs font-extrabold ${
                    filterMode === "due"
                      ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                      : "border-[var(--border)] bg-white text-slate-700"
                  }`}
                >
                  Cần ôn ({dueCards.length})
                </Button>
                <Button
                  size="sm"
                  variant={filterMode === "hard" ? "default" : "outline"}
                  onClick={() => setFilterMode("hard")}
                  className={`h-9 rounded-2xl px-3.5 text-xs font-extrabold ${
                    filterMode === "hard"
                      ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                      : "border-[var(--border)] bg-white text-slate-700"
                  }`}
                >
                  Thẻ khó ({hardCount})
                </Button>
              </div>

              <div className="relative min-w-56">
                <Search
                  size={15}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Lọc từ vựng trong bộ..."
                  aria-label="Lọc từ vựng trong bộ"
                  className="h-10 rounded-2xl border-[var(--border)] bg-white pr-3 pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            {displayedCards.map((card) => (
              <CardListItem
                key={card.id}
                card={card}
                layout="detail"
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onToggleDifficult={onToggleDifficult}
              />
            ))}

            {!displayedCards.length && (
              <p className="p-8 text-center text-sm font-semibold text-slate-500">
                Không tìm thấy thẻ nào theo bộ lọc.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
