"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Download,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeDeckStatsMap, filterCards } from "@/lib/domain/cards";
import type { Card, Deck, Store } from "@/types/lexilo";
import { CardListItem } from "./card-list-item";

interface LibraryPanelProps {
  data: Store;
  now: number;
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
}

export function LibraryPanel({
  data,
  now,
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
}: LibraryPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedDeckFilter, setSelectedDeckFilter] = useState("all");

  const statsMap = useMemo(
    () => computeDeckStatsMap(data.decks, data.cards, now),
    [data.decks, data.cards, now],
  );

  const deckMap = useMemo(
    () => new Map(data.decks.map((d) => [d.id, d])),
    [data.decks],
  );

  const filteredCards = useMemo(
    () =>
      filterCards(data.cards, {
        deckId: selectedDeckFilter,
        search,
        now,
      }),
    [data.cards, selectedDeckFilter, search, now],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 break-words">Thư viện của bạn</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {data.decks.length} bộ thẻ · {data.cards.length} thẻ · Lưu trữ ngoại tuyến &amp; Đồng bộ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onCreateDeck}
            className="clay-cta h-10 rounded-2xl bg-[#7c3aed] px-4 font-bold text-white hover:bg-[#6d28d9]"
          >
            <Plus size={16} strokeWidth={2.5} /> Tạo bộ thẻ mới
          </Button>
          <Button
            variant="outline"
            onClick={onCsv}
            className="tap-press h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white font-bold text-slate-700 hover:border-violet-200"
          >
            <Download size={15} /> CSV
          </Button>
          <Button
            variant="outline"
            onClick={onBackup}
            className="tap-press h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white font-bold text-slate-700 hover:border-violet-200"
          >
            <Download size={15} /> Sao lưu
          </Button>
          <label className="tap-press inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl border-[1.5px] border-[var(--border)] bg-white px-3.5 text-sm font-bold text-slate-700 shadow-[var(--clay-shadow-soft)] hover:border-violet-200 hover:bg-violet-50/40">
            <Upload size={15} /> Khôi phục
            <input
              className="sr-only"
              type="file"
              accept=".json"
              onChange={(event) => event.target.files?.[0] && onRestore(event.target.files[0])}
            />
          </label>
        </div>
      </div>

      <div>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-slate-900">Danh sách bộ thẻ</h2>
          <span className="text-xs font-extrabold text-slate-500">{data.decks.length} bộ thẻ</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.decks.map((deck) => {
            const stats = statsMap.get(deck.id) ?? { total: 0, due: 0, hard: 0 };
            return (
              <article
                key={deck.id}
                className="clay-card-interactive group relative rounded-3xl p-5"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="grid size-12 place-items-center rounded-2xl font-black text-white shadow-[0_6px_16px_-4px_rgba(15,23,42,0.22),inset_0_1.5px_0_rgba(255,255,255,0.4)]"
                    style={{ background: deck.color }}
                  >
                    <BookOpen size={20} strokeWidth={2.25} />
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-xl text-slate-500 hover:bg-violet-50 hover:text-slate-900"
                      onClick={() => onEditDeck(deck)}
                      title="Chỉnh sửa bộ thẻ"
                      aria-label="Sửa bộ thẻ"
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => onDeleteDeck(deck)}
                      title="Xóa bộ thẻ"
                      aria-label="Xóa bộ thẻ"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>

                <button onClick={() => onOpenDeck(deck.id)} className="mt-3.5 w-full rounded-xl text-left">
                  <h3 className="font-display text-lg font-bold text-slate-900 transition-colors group-hover:text-[#6d28d9]">
                    {deck.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                    <span>{stats.total} thẻ</span>
                    <span>·</span>
                    <b style={{ color: deck.color }}>{stats.due} đến hạn</b>
                    {stats.hard > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-extrabold text-amber-700">{stats.hard} thẻ khó</span>
                      </>
                    )}
                  </div>
                </button>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <Button
                    variant="outline"
                    disabled={!stats.total}
                    onClick={() => onFree(deck)}
                    className="tap-press h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white text-xs font-bold text-slate-700 hover:border-violet-300"
                  >
                    <Layers3 size={15} /> Học tự do
                  </Button>
                  <Button
                    disabled={!stats.due}
                    onClick={() => onDue(deck)}
                    className="clay-cta h-10 rounded-2xl text-xs font-extrabold text-white disabled:opacity-50"
                    style={{ backgroundColor: stats.due ? deck.color : undefined }}
                  >
                    <CalendarDays size={15} /> Ôn {stats.due}
                  </Button>
                </div>

                <div className="mt-2.5 text-center">
                  <button
                    onClick={() => onAddCard(deck)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold text-slate-600 transition-colors hover:bg-violet-50 hover:text-[#6d28d9]"
                  >
                    <Plus size={13} /> Thêm thẻ vào bộ này
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="clay-card overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--border)] bg-[#fdfbff] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Tất cả thẻ trong thư viện
              </h2>
              <p className="text-xs font-semibold text-slate-600">
                Hiển thị {filteredCards.length} / {data.cards.length} thẻ
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-56">
                <Search
                  size={15}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm từ vựng, nghĩa..."
                  aria-label="Tìm từ vựng, nghĩa"
                  className="h-10 rounded-2xl border-[var(--border)] bg-white pr-3 pl-9 text-sm"
                />
              </div>

              <select
                value={selectedDeckFilter}
                onChange={(e) => setSelectedDeckFilter(e.target.value)}
                aria-label="Lọc theo bộ thẻ"
                className="h-10 w-full rounded-2xl border-[1.5px] border-[var(--border)] bg-white px-3.5 text-xs font-bold text-slate-700 sm:w-auto"
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
            {filteredCards.map((card) => (
              <CardListItem
                key={card.id}
                card={card}
                deck={deckMap.get(card.deckId)}
                layout="table"
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onToggleDifficult={onToggleDifficult}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm font-semibold text-slate-500">
            {search ? "Không tìm thấy thẻ phù hợp với từ khóa." : "Chưa có thẻ nào."}
          </div>
        )}
      </div>
    </div>
  );
}
