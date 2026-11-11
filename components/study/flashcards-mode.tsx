"use client";

import { type TouchEvent, useCallback, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Flag,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { shuffle } from "@/lib/domain/quiz";
import { speakCard } from "@/lib/services/speech";
import type { Card, Direction, Rating } from "@/types/lexilo";
import { Flashcard3D } from "./flashcard-3d";
import {
  ModeHeader,
  RatingButtons,
  StudyControl,
  StudyEmptyState,
  StudyToggle,
} from "./study-shared";

interface FlashcardsModeProps {
  cards: Card[];
  title: string;
  onBack: () => void;
  onToggleDifficult: (card: Card) => Promise<void>;
  onRate: (cardId: string, rating: Rating) => Promise<void>;
}

export function FlashcardsMode({
  cards,
  title,
  onBack,
  onToggleDifficult,
  onRate,
}: FlashcardsModeProps) {
  const [order, setOrder] = useState(() => cards.map((card) => card.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [randomOrder, setRandomOrder] = useState(false);
  const [onlyDifficult, setOnlyDifficult] = useState(false);
  const [direction, setDirection] = useState<Direction>("en-vi");
  const [recordFsrs, setRecordFsrs] = useState(false);
  const [busy, setBusy] = useState(false);
  const touchStart = useRef<number | null>(null);

  const eligible = onlyDifficult ? cards.filter((card) => card.isDifficult) : cards;
  const ids = order.filter((id) => eligible.some((card) => card.id === id));
  const safeIndex = ids.length ? Math.min(index, ids.length - 1) : 0;
  const card = cards.find((candidate) => candidate.id === ids[safeIndex]);

  const next = useCallback(() => {
    if (!ids.length) return;
    if (safeIndex + 1 >= ids.length) {
      setDone(true);
    } else {
      setIndex(safeIndex + 1);
    }
    setFlipped(false);
  }, [ids.length, safeIndex]);

  const previous = useCallback(() => {
    setDone(false);
    setIndex(Math.max(0, safeIndex - 1));
    setFlipped(false);
  }, [safeIndex]);

  function restart(shuffled = randomOrder, hardOnly = onlyDifficult) {
    const source = (hardOnly ? cards.filter((item) => item.isDifficult) : cards).map(
      (item) => item.id,
    );
    setOnlyDifficult(hardOnly);
    setOrder(shuffled ? shuffle(source) : source);
    setIndex(0);
    setFlipped(false);
    setDone(false);
  }

  function toggleOrder(enabled: boolean) {
    setRandomOrder(enabled);
    setOrder(enabled ? shuffle(ids) : eligible.map((item) => item.id));
    setIndex(0);
    setFlipped(false);
    setDone(false);
  }

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card) return;
      setBusy(true);
      try {
        await onRate(card.id, rating);
        next();
      } finally {
        setBusy(false);
      }
    },
    [card, onRate, next],
  );

  function onTouchStart(event: TouchEvent) {
    touchStart.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent) {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    if (distance > 55) previous();
    if (distance < -55) next();
    touchStart.current = null;
  }

  useKeyboardShortcuts(Boolean(ids.length) && !done, (event) => {
    if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      setFlipped((val) => !val);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
      return;
    }
    if (event.key.toLowerCase() === "r") {
      if (card) {
        event.preventDefault();
        speakCard(card);
      }
      return;
    }
    if (event.key.toLowerCase() === "f") {
      if (card) {
        event.preventDefault();
        void onToggleDifficult(card);
      }
      return;
    }

    if (recordFsrs && card && !busy) {
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
      }
    }
  });

  const frontPrimary = direction === "en-vi";

  function renderDifficultFooter(hintText: string) {
    if (!card) return null;
    return (
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void onToggleDifficult(card);
          }}
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
            card.isDifficult
              ? "bg-amber-100 text-amber-800"
              : "bg-[#f7f3fd] text-slate-600 hover:bg-violet-100/70"
          }`}
        >
          <Flag size={14} className={card.isDifficult ? "fill-amber-400 text-amber-500" : ""} />
          {card.isDifficult ? "Đã đánh dấu Khó" : "Đánh dấu Khó"}
          <kbd className="ml-1 font-mono text-[10px] opacity-65">[F]</kbd>
        </button>
        <span className="text-xs font-bold text-slate-500">
          Bấm{" "}
          <kbd className="rounded-md border border-[var(--border)] bg-[#f7f3fd] px-1.5 py-0.5 font-mono text-slate-700">
            Space
          </kbd>{" "}
          {hintText}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ModeHeader
        title="Flashcards · Học tự do"
        subtitle={`${title} · không tự thay đổi lịch FSRS`}
        onBack={onBack}
      />

      <div className="clay-card mb-4 grid gap-2.5 rounded-3xl p-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StudyControl label="Mặt trước">
          <select
            value={direction}
            onChange={(event) => {
              setDirection(event.target.value as Direction);
              setFlipped(false);
            }}
            aria-label="Chiều hiển thị"
            className="h-10 w-full rounded-2xl border-[1.5px] border-[var(--border)] bg-white px-2.5 text-xs font-bold text-slate-800"
          >
            <option value="en-vi">English → Vietnamese</option>
            <option value="vi-en">Vietnamese → English</option>
          </select>
        </StudyControl>
        <StudyToggle label="Xáo trộn" checked={randomOrder} onChange={toggleOrder} />
        <StudyToggle
          label="Chỉ thẻ khó"
          checked={onlyDifficult}
          onChange={(checked) => {
            setOnlyDifficult(checked);
            restart(randomOrder, checked);
          }}
        />
        <StudyToggle label="Ghi vào FSRS" checked={recordFsrs} onChange={setRecordFsrs} />
      </div>

      {!ids.length ? (
        <StudyEmptyState
          title={onlyDifficult ? "Chưa có thẻ được đánh dấu Khó" : "Bộ thẻ đang trống"}
          onBack={onBack}
        />
      ) : done ? (
        <div className="clay-card rounded-[32px] p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-[#047857]">
            <Check size={32} strokeWidth={2.75} />
          </span>
          <h2 className="font-display mt-4 text-2xl font-bold text-slate-900">
            Đã xem hết {ids.length} thẻ
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Bạn có thể học lại ngay mà không cần chờ đến hạn.
          </p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <Button
              onClick={() => restart(false, false)}
              className="clay-cta h-11 rounded-2xl bg-[#7c3aed] font-bold text-white hover:bg-[#6d28d9]"
            >
              <RotateCcw size={16} />
              Học lại từ đầu
            </Button>
            <Button
              variant="outline"
              onClick={() => restart(true, false)}
              className="tap-press h-11 rounded-2xl border-[var(--border)] bg-white font-bold"
            >
              <Shuffle size={16} />
              Xáo trộn và học lại
            </Button>
            <Button
              variant="outline"
              disabled={!cards.some((item) => item.isDifficult)}
              onClick={() => restart(randomOrder, true)}
              className="tap-press h-11 rounded-2xl border-[var(--border)] bg-white font-bold"
            >
              <Flag size={16} />
              Chỉ học thẻ khó
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="tap-press h-11 rounded-2xl border-[var(--border)] bg-white font-bold"
            >
              <ChevronLeft size={16} />
              Trở về bộ thẻ
            </Button>
          </div>
        </div>
      ) : card ? (
        <>
          <div className="mb-3 flex items-center gap-3">
            <Progress value={((safeIndex + 1) / ids.length) * 100} className="h-2.5 rounded-full" />
            <b className="text-sm font-extrabold whitespace-nowrap text-slate-600">
              {safeIndex + 1} / {ids.length}
            </b>
          </div>

          <Flashcard3D
            card={card}
            flipped={flipped}
            direction={direction}
            frontLabel={frontPrimary ? "Tiếng Anh" : "Tiếng Việt"}
            backLabel={frontPrimary ? "Tiếng Việt (Nghĩa)" : "Tiếng Anh"}
            backAccentVariant="indigo"
            onFlip={() => setFlipped((value) => !value)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            footerContent={renderDifficultFooter("để lật")}
            backFooterContent={renderDifficultFooter("để lật lại")}
          />

          {recordFsrs && flipped && (
            <div className="mt-4">
              <p className="mb-2 text-center text-xs font-bold text-amber-800">
                Lựa chọn dưới đây sẽ cập nhật lịch FSRS (Phím tắt 1 - 4).
              </p>
              <RatingButtons onRate={(r) => void rate(r)} disabled={busy} />
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <Button
              variant="outline"
              disabled={safeIndex === 0}
              onClick={previous}
              className="tap-press h-11 rounded-2xl border-[var(--border)] bg-white font-bold text-slate-700"
            >
              <ArrowLeft size={16} /> Thẻ trước{" "}
              <kbd className="ml-1 hidden font-mono text-xs opacity-60 sm:inline">←</kbd>
            </Button>
            <Button
              variant="outline"
              onClick={() => restart(true, onlyDifficult)}
              className="tap-press h-11 rounded-2xl border-[var(--border)] bg-white font-bold text-slate-700"
            >
              <Shuffle size={16} /> Xáo trộn
            </Button>
            <Button
              onClick={next}
              className="clay-cta h-11 rounded-2xl bg-[#7c3aed] font-bold text-white hover:bg-[#6d28d9]"
            >
              Tiếp theo{" "}
              <kbd className="ml-1 hidden font-mono text-xs opacity-60 sm:inline">→</kbd>{" "}
              <ArrowRight size={16} />
            </Button>
          </div>

          <div className="clay-surface mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                Space
              </kbd>{" "}
              Lật
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                ←
              </kbd>
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                →
              </kbd>{" "}
              Chuyển thẻ
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                R
              </kbd>{" "}
              Phát âm
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                F
              </kbd>{" "}
              Đánh dấu Khó
            </span>
            {recordFsrs && (
              <span className="flex items-center gap-1">
                <kbd className="rounded-md border border-[var(--border)] bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                  1-4
                </kbd>{" "}
                Đánh giá
              </span>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
