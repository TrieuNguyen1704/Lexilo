"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { speakCard } from "@/lib/services/speech";
import type { Card, Rating } from "@/types/lexilo";
import { Flashcard3D } from "./flashcard-3d";
import { ModeHeader, RatingButtons, StudyCompletion } from "./study-shared";

interface ScheduledStudyProps {
  cards: Card[];
  title: string;
  onRate: (cardId: string, rating: Rating) => Promise<void>;
  onBack: () => void;
}

export function ScheduledStudy({ cards, title, onRate, onBack }: ScheduledStudyProps) {
  const [ids] = useState(() => cards.map((card) => card.id));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  const card = cards.find((candidate) => candidate.id === ids[index]);
  const done = index >= ids.length;

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);
      try {
        await onRate(card.id, rating);
        setIndex((current) => current + 1);
        setRevealed(false);
      } finally {
        setBusy(false);
      }
    },
    [card, busy, onRate],
  );

  useKeyboardShortcuts(!done && Boolean(card), (event) => {
    if (!card) return;

    if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      setRevealed((prev) => !prev);
      return;
    }

    const ratingByKey: Record<string, Rating> = {
      "1": "again",
      "2": "hard",
      "3": "good",
      "4": "easy",
    };
    const rating = ratingByKey[event.key];
    if (rating) {
      event.preventDefault();
      void rate(rating);
      return;
    }

    const lower = event.key.toLowerCase();
    if (lower === "r" || lower === "a") {
      event.preventDefault();
      speakCard(card);
    }
  });

  return (
    <div className="mx-auto max-w-2xl">
      <ModeHeader
        title="Ôn theo lịch"
        subtitle={`${title} · chỉ các thẻ đã đến hạn`}
        onBack={onBack}
      />

      {done || !card ? (
        <StudyCompletion
          title="Hoàn thành phiên ôn!"
          detail="Lịch FSRS và lịch sử ôn đã được cập nhật."
          onBack={onBack}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Progress value={(index / ids.length) * 100} className="h-2.5 rounded-full" />
            <b className="text-sm font-extrabold whitespace-nowrap text-slate-600">
              {index + 1} / {ids.length}
            </b>
          </div>

          <Flashcard3D
            card={card}
            flipped={revealed}
            frontLabel="Ôn theo lịch FSRS"
            backLabel="Đáp án (Mặt sau)"
            backAccentVariant="emerald"
            onFlip={() => setRevealed((value) => !value)}
            footerContent={
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <span>Nhấp thẻ hoặc bấm</span>
                <kbd className="rounded-lg border border-[var(--border)] bg-[#f7f3fd] px-2 py-0.5 font-mono text-slate-700 shadow-2xs">
                  Space
                </kbd>
                <span>để hiện đáp án</span>
              </div>
            }
            backFooterContent={
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                <span>Bấm phím số</span>
                {["1", "2", "3", "4"].map((k) => (
                  <kbd
                    key={k}
                    className="rounded-lg border border-[var(--border)] bg-[#f7f3fd] px-1.5 py-0.5 font-mono text-slate-700"
                  >
                    {k}
                  </kbd>
                ))}
                <span>để đánh giá</span>
              </div>
            }
          />

          <div className="mt-5">
            {!revealed ? (
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button
                  onClick={() => setRevealed(true)}
                  className="clay-cta h-14 flex-1 rounded-2xl bg-[#7c3aed] text-base font-extrabold text-white hover:bg-[#6d28d9]"
                >
                  Hiện đáp án{" "}
                  <kbd className="ml-2 rounded-lg bg-white/20 px-2 py-0.5 font-mono text-xs">
                    Space
                  </kbd>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-600">
                  <span>Đánh giá mức độ ghi nhớ:</span>
                  <span>Phím tắt [1 - 4]</span>
                </div>
                <RatingButtons onRate={(r) => void rate(r)} disabled={busy} />
              </div>
            )}
          </div>

          <div className="clay-surface mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                Space
              </kbd>{" "}
              Lật thẻ
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                1
              </kbd>{" "}
              Quên
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                2
              </kbd>{" "}
              Khó
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                3
              </kbd>{" "}
              Tốt
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                4
              </kbd>{" "}
              Dễ
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                R
              </kbd>{" "}
              Nghe
            </span>
          </div>
        </>
      )}
    </div>
  );
}
