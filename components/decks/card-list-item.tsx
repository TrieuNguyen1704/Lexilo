"use client";

import { Flag, Pencil, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakCard } from "@/lib/services/speech";
import type { Card, Deck } from "@/types/lexilo";

interface CardListItemProps {
  card: Card;
  deck?: Deck;
  layout?: "table" | "detail";
  onEdit: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onToggleDifficult: (card: Card) => void;
}

export function CardListItem({
  card,
  deck,
  layout = "table",
  onEdit,
  onDelete,
  onToggleDifficult,
}: CardListItemProps) {
  if (layout === "detail") {
    return (
      <div className="grid items-center gap-3 border-b border-[var(--border)] p-4 transition-colors last:border-0 hover:bg-violet-50/35 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-bold break-words text-slate-900">
              {card.front}
            </span>
            {card.isDifficult && <Flag size={14} className="fill-amber-400 text-amber-500" />}
          </div>
          {card.ipa && <p className="mt-0.5 text-xs font-semibold text-slate-500">{card.ipa}</p>}
          {card.partOfSpeech && (
            <span className="mt-1.5 inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-extrabold lowercase text-[#6d28d9]">
              {card.partOfSpeech}
            </span>
          )}
          <p className="mt-1.5 text-sm font-bold text-slate-700">{card.back}</p>
          {card.example && <p className="mt-1 text-xs italic text-slate-500">“{card.example}”</p>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => speakCard(card)}
            className="size-9 rounded-xl p-0 text-slate-600 hover:bg-violet-50 hover:text-slate-900"
            title="Nghe phát âm"
            aria-label="Phát âm"
          >
            <Volume2 size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleDifficult(card)}
            className={`h-9 rounded-xl px-2.5 text-xs font-bold ${
              card.isDifficult
                ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Flag size={14} className={card.isDifficult ? "fill-amber-400 text-amber-500" : ""} />
            {card.isDifficult ? "Đã Khó" : "Đánh dấu Khó"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(card)}
            aria-label="Sửa thẻ"
            className="size-9 rounded-xl text-slate-600 hover:bg-violet-50 hover:text-slate-900"
          >
            <Pencil size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(card.id)}
            className="size-9 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Xóa thẻ"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-center gap-3 border-b border-[var(--border)] p-4 transition-colors last:border-0 hover:bg-violet-50/35 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_auto]">
      <button onClick={() => onEdit(card)} className="min-w-0 rounded-xl text-left hover:text-[#6d28d9]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-bold break-words text-slate-900">
            {card.front}
          </span>
          {deck && (
            <span
              className="inline-flex rounded-lg px-2 py-0.5 text-[10px] font-extrabold text-white"
              style={{ backgroundColor: deck.color }}
            >
              {deck.name}
            </span>
          )}
          {card.isDifficult && <Flag size={14} className="fill-amber-400 text-amber-500" />}
        </div>
        {card.ipa && <p className="mt-0.5 text-xs font-semibold text-slate-500">{card.ipa}</p>}
        {card.partOfSpeech && (
          <span className="mt-1 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold lowercase text-[#6d28d9]">
            {card.partOfSpeech}
          </span>
        )}
      </button>

      <div className="min-w-0">
        <span className="text-sm font-bold text-slate-700 sm:text-base">{card.back}</span>
        {card.example && (
          <p className="mt-1 truncate text-xs italic text-slate-500">“{card.example}”</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl text-slate-500 hover:bg-violet-50 hover:text-slate-800"
          onClick={() => speakCard(card)}
          aria-label="Phát âm"
          title="Nghe phát âm"
        >
          <Volume2 size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl text-slate-500 hover:bg-amber-50 hover:text-amber-700"
          onClick={() => onToggleDifficult(card)}
          aria-label="Đánh dấu khó"
          title={card.isDifficult ? "Bỏ đánh dấu khó" : "Đánh dấu thẻ khó"}
        >
          <Flag size={16} className={card.isDifficult ? "fill-amber-400 text-amber-500" : ""} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl text-slate-500 hover:bg-violet-50 hover:text-slate-900"
          onClick={() => onEdit(card)}
          aria-label="Sửa thẻ"
        >
          <Pencil size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => onDelete(card.id)}
          aria-label="Xóa thẻ"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}
