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
    <article className="rounded-2xl border bg-white p-5 transition hover:border-slate-300 hover:shadow-lg">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex justify-between">
          <span
            className="grid size-11 place-items-center rounded-xl font-black text-white"
            style={{ background: deck.color }}
          >
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
        <Button
          variant="outline"
          size="sm"
          disabled={!count}
          onClick={onFree}
          className="rounded-xl"
        >
          <Layers3 size={15} /> Học tự do
        </Button>
        <Button
          size="sm"
          disabled={!due}
          onClick={onDue}
          className="rounded-xl font-bold text-white"
          style={{ backgroundColor: due ? deck.color : undefined }}
        >
          <CalendarDays size={15} /> Ôn {due}
        </Button>
      </div>
    </article>
  );
}
