"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
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
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">
            ⏱ {elapsed}s
          </span>
        }
      />

      {!cards.length ? (
        <StudyEmptyState title="Bộ thẻ đang trống" onBack={onBack} />
      ) : complete ? (
        <div className="rounded-[28px] border bg-white p-8 text-center shadow-sm">
          <Check className="mx-auto text-[#17a673]" size={56} />
          <h2 className="mt-4 text-3xl font-black">Ghép xong!</h2>
          <p className="mt-2 text-slate-500">
            Thời gian: {elapsed} giây · Ghép sai: {mistakes} lần
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={reset}>
              <RotateCcw />
              Chơi lại
            </Button>
            <Button variant="outline" onClick={onBack}>
              Trở về
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const isMatched = matched.includes(tile.key);
            const isSelected = selected.includes(tile.key);
            const isWrong = wrong.includes(tile.key);
            return (
              <button
                key={tile.key}
                disabled={isMatched}
                onClick={() => choose(tile)}
                className={`min-h-28 rounded-2xl border p-3 text-sm font-black transition sm:min-h-32 sm:text-base ${
                  isMatched
                    ? "pointer-events-none scale-90 opacity-0"
                    : isWrong
                    ? "border-red-400 bg-red-50 text-red-700"
                    : isSelected
                    ? "border-[#6c63ff] bg-[#f0efff] text-[#554ceb] shadow-md"
                    : "bg-white hover:-translate-y-0.5 hover:shadow-md"
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
