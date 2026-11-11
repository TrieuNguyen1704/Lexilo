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
      <div className="rounded-2xl border bg-white p-8 text-center">
        <p className="font-bold text-slate-600">Không tìm thấy bộ thẻ.</p>
        <Button onClick={onBack} className="mt-4 rounded-xl">
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl">
            <ChevronLeft />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: deck.color }}
              />
              <p className="text-xs font-black tracking-wider uppercase" style={{ color: deck.color }}>
                BỘ THẺ
              </p>
            </div>
            <h1 className="text-3xl font-black text-slate-900">{deck.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {cards.length} thẻ · {dueCards.length} đến hạn · {hardCount} thẻ khó
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onAddCard}
            className="rounded-xl bg-[#6c63ff] font-bold text-white hover:bg-[#5b52f5]"
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
            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            title="Xóa bộ thẻ này"
          >
            <Trash2 size={15} /> Xóa bộ
          </Button>
          <Button variant="ghost" onClick={onQuickImport} className="rounded-xl text-slate-600">
            <Sparkles size={15} /> Nhập nhanh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STUDY_MODES.map(({ key, icon: Icon, label, detail }) => (
          <button
            key={key}
            disabled={!cards.length}
            onClick={() => onMode(key)}
            className="group rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-1 hover:border-[#6c63ff]/40 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[#f0efff] text-[#6258ef] transition-colors group-hover:bg-[#6258ef] group-hover:text-white">
              <Icon size={22} />
            </span>
            <b className="mt-4 block text-lg font-black">{label}</b>
            <span className="mt-1 block text-sm text-slate-500">{detail}</span>
          </button>
        ))}
      </div>

      {!cards.length ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center">
          <BookOpen className="mx-auto text-slate-300" size={44} />
          <h2 className="mt-3 text-xl font-black">Bộ thẻ đang trống</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bạn có thể thêm từng thẻ bằng nút &ldquo;Thêm thẻ mới&rdquo; hoặc dán danh sách bằng
            &ldquo;Nhập nhanh&rdquo;.
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
                  Thẻ khó ({hardCount})
                </Button>
              </div>

              <div className="relative min-w-56">
                <Search
                  size={15}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Lọc từ vựng trong bộ..."
                  className="h-9 rounded-xl pr-3 pl-9 text-sm"
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
