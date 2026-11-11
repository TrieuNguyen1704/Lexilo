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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Thư viện của bạn</h1>
          <p className="mt-1 text-slate-500">
            {data.decks.length} bộ thẻ · {data.cards.length} thẻ · Lưu trữ ngoại tuyến &amp; Đồng bộ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onCreateDeck}
            className="rounded-xl bg-[#6c63ff] font-bold text-white hover:bg-[#5b52f5]"
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">Danh sách bộ thẻ</h2>
          <span className="text-xs font-bold text-slate-400">{data.decks.length} bộ thẻ</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.decks.map((deck) => {
            const stats = statsMap.get(deck.id) ?? { total: 0, due: 0, hard: 0 };
            return (
              <article
                key={deck.id}
                className="group relative rounded-2xl border bg-white p-5 transition hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="grid size-11 place-items-center rounded-2xl font-black text-white shadow-sm"
                    style={{ background: deck.color }}
                  >
                    <BookOpen size={20} />
                  </span>

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

                <button onClick={() => onOpenDeck(deck.id)} className="mt-3 w-full text-left">
                  <h3 className="text-lg font-black text-slate-900 transition-colors group-hover:text-[#6c63ff]">
                    {deck.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    <span>{stats.total} thẻ</span>
                    <span>·</span>
                    <b style={{ color: deck.color }}>{stats.due} đến hạn</b>
                    {stats.hard > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-bold text-amber-600">{stats.hard} thẻ khó</span>
                      </>
                    )}
                  </div>
                </button>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!stats.total}
                    onClick={() => onFree(deck)}
                    className="rounded-xl"
                  >
                    <Layers3 size={15} /> Học tự do
                  </Button>
                  <Button
                    size="sm"
                    disabled={!stats.due}
                    onClick={() => onDue(deck)}
                    className="rounded-xl font-bold text-white"
                    style={{ backgroundColor: stats.due ? deck.color : undefined }}
                  >
                    <CalendarDays size={15} /> Ôn {stats.due}
                  </Button>
                </div>

                <div className="mt-2 text-center">
                  <button
                    onClick={() => onAddCard(deck)}
                    className="inline-flex items-center gap-1 py-1 text-xs font-bold text-slate-500 hover:text-[#6c63ff]"
                  >
                    <Plus size={13} /> Thêm thẻ vào bộ này
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

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
                <Search
                  size={15}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm từ vựng, nghĩa..."
                  className="h-9 rounded-xl pr-3 pl-9 text-sm"
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
          <div className="p-8 text-center text-slate-500">
            {search ? "Không tìm thấy thẻ phù hợp với từ khóa." : "Chưa có thẻ nào."}
          </div>
        )}
      </div>
    </div>
  );
}
