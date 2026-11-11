"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shuffle } from "@/lib/domain/quiz";
import type { Card } from "@/types/lexilo";
import { ModeHeader, StudyEmptyState } from "./study-shared";

interface MatchTile {
  key: string;
  cardId: string;
  kind: "front" | "back";
  label: string;
}

interface MatchModeProps {
  cards: Card[];
  title: string;
  onBack: () => void;
}

function createMatchTiles(cards: Card[]): MatchTile[] {
  const chosen = shuffle(cards).slice(0, 6);
  return shuffle(
    chosen.flatMap((card) => [
      { key: `${card.id}-front`, cardId: card.id, kind: "front" as const, label: card.front },
      { key: `${card.id}-back`, cardId: card.id, kind: "back" as const, label: card.back },
    ]),
  );
}

export function MatchMode({ cards, title, onBack }: MatchModeProps) {
  const [tiles, setTiles] = useState<MatchTile[]>(() => createMatchTiles(cards));
  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  function reset() {
    setTiles(createMatchTiles(cards));
    setSelected([]);
    setMatched([]);
    setWrong([]);
    setMistakes(0);
    setElapsed(0);
    setStartedAt(Date.now());
  }

  const complete = Boolean(tiles.length) && matched.length === tiles.length;

  useEffect(() => {
    if (complete || !tiles.length) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [complete, startedAt, tiles.length]);

  function choose(tile: MatchTile) {
    if (matched.includes(tile.key) || selected.includes(tile.key) || selected.length > 1) return;
    if (!selected.length) {
      setSelected([tile.key]);
      return;
    }

    const first = tiles.find((candidate) => candidate.key === selected[0])!;
    if (first.cardId === tile.cardId && first.kind !== tile.kind) {
      setMatched((items) => [...items, first.key, tile.key]);
      setSelected([]);
    } else {
      setMistakes((count) => count + 1);
      setSelected([first.key, tile.key]);
      setWrong([first.key, tile.key]);
      window.setTimeout(() => {
        setSelected([]);
        setWrong([]);
      }, 550);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ModeHeader
        title="Match"
        subtitle={`${title} · tối đa 6 cặp · không thay đổi FSRS`}
        onBack={onBack}
        trailing={
          <span className="clay-surface inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold text-slate-800">
            <Timer size={16} className="text-[#7c3aed]" />
            <span>{elapsed}s</span>
          </span>
        }
      />

      {!cards.length ? (
        <StudyEmptyState title="Bộ thẻ đang trống" onBack={onBack} />
      ) : complete ? (
        <div className="clay-card rounded-[32px] p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-[#047857]">
            <Check size={34} strokeWidth={2.75} />
          </span>
          <h2 className="font-display mt-4 text-3xl font-bold text-slate-900">Ghép xong!</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Thời gian: {elapsed} giây · Ghép sai: {mistakes} lần
          </p>
          <div className="mt-6 flex justify-center gap-2.5">
            <Button
              onClick={reset}
              className="clay-cta h-11 rounded-2xl bg-[#7c3aed] px-5 font-bold text-white hover:bg-[#6d28d9]"
            >
              <RotateCcw size={16} />
              Chơi lại
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="h-11 rounded-2xl border-[var(--border)] bg-white px-5 font-bold"
            >
              Trở về
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const isMatched = matched.includes(tile.key);
            const isSelected = selected.includes(tile.key);
            const isWrong = wrong.includes(tile.key);
            return (
              <button
                key={tile.key}
                disabled={isMatched}
                onClick={() => choose(tile)}
                className={`min-h-28 rounded-3xl border-2 p-3.5 text-sm font-extrabold transition-all sm:min-h-32 sm:text-base ${
                  isMatched
                    ? "pointer-events-none scale-90 opacity-0"
                    : isWrong
                    ? "border-red-400 bg-red-50 text-red-700 shadow-xs"
                    : isSelected
                    ? "border-[#7c3aed] bg-violet-50 text-[#5b21b6] shadow-[0_10px_22px_-6px_rgba(124,58,237,0.3)]"
                    : "clay-card-interactive border-[var(--border)] text-slate-800"
                }`}
              >
                {tile.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
