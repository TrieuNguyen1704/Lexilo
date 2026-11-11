"use client";

import { BookOpen, CalendarDays, ChevronRight, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Deck } from "@/types/lexilo";

interface DeckCardProps {
  deck: Deck;
  count: number;
  due: number;
  onOpen: () => void;
  onFree: () => void;
  onDue: () => void;
}

export function DeckCard({ deck, count, due, onOpen, onFree, onDue }: DeckCardProps) {
  return (
    <article className="clay-card-interactive rounded-3xl p-5">
      <button onClick={onOpen} className="w-full rounded-2xl text-left">
        <div className="flex items-center justify-between">
          <span
            className="grid size-12 place-items-center rounded-2xl font-black text-white shadow-[0_6px_16px_-4px_rgba(15,23,42,0.22),inset_0_1.5px_0_rgba(255,255,255,0.4)]"
            style={{ background: deck.color }}
          >
            <BookOpen size={21} strokeWidth={2.25} />
          </span>
          <ChevronRight className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </div>
        <h3 className="font-display mt-4 text-lg font-bold text-slate-900">{deck.name}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {count} thẻ ·{" "}
          <strong className="font-extrabold" style={{ color: deck.color }}>
            {due} đến hạn
          </strong>
        </p>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Button
          variant="outline"
          disabled={!count}
          onClick={onFree}
          className="tap-press h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white text-xs font-bold text-slate-700 hover:border-violet-300 hover:bg-violet-50/40"
        >
          <Layers3 size={15} /> Học tự do
        </Button>
        <Button
          disabled={!due}
          onClick={onDue}
          className="clay-cta h-10 rounded-2xl text-xs font-extrabold text-white disabled:opacity-50"
          style={{ backgroundColor: due ? deck.color : undefined }}
        >
          <CalendarDays size={15} /> Ôn {due}
        </Button>
      </div>
    </article>
  );
}
