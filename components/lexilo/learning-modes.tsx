"use client";

import { FormEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  HelpCircle,
  RotateCcw,
  Shuffle,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  answerFor,
  Card,
  choicesFor,
  Direction,
  DirectionChoice,
  normalizeAnswer,
  questionFor,
  QuestionKind,
  Rating,
  resolveDirection,
  shuffle,
} from "@/lib/lexilo";

type ReviewResult = { cardId: string; rating: Rating };

function speak(card: Card) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(card.front);
  utterance.lang = "en-US";
  speechSynthesis.speak(utterance);
}

function WordMeta({ card, centered = true }: { card: Card; centered?: boolean }) {
  return (
    <div className={centered ? "text-center" : ""}>
      {card.ipa && <p className="mt-2 text-lg font-semibold tracking-wide text-slate-400">{card.ipa}</p>}
      {card.partOfSpeech && (
        <span className="mt-2 inline-flex rounded-full bg-[#f0efff] px-2.5 py-1 text-xs font-black lowercase text-[#6258ef]">
          {card.partOfSpeech}
        </span>
      )}
    </div>
  );
}

function ModeHeader({ title, subtitle, onBack, trailing }: { title: string; subtitle: string; onBack: () => void; trailing?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack} aria-label="Quay lại"><ChevronLeft /></Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {trailing}
    </div>
  );
}

function RatingButtons({ onRate, disabled }: { onRate: (rating: Rating) => void; disabled?: boolean }) {
  const ratings: [Rating, string, string, string, string][] = [
    ["again", "Quên", "10 phút", "#ef4444", "1"],
    ["hard", "Khó", "1 ngày", "#e9a11b", "2"],
    ["good", "Tốt", "Tự tính", "#17a673", "3"],
    ["easy", "Dễ", "4+ ngày", "#6c63ff", "4"],
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {ratings.map(([rating, label, hint, color, key]) => (
        <button
          key={rating}
          disabled={disabled}
          onClick={() => onRate(rating)}
          className="group relative rounded-2xl border-2 bg-white p-3.5 text-center font-black transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50"
          style={{ borderColor: `${color}35` }}
        >
          <div className="flex items-center justify-center gap-1.5" style={{ color }}>
            <kbd className="inline-flex size-5 items-center justify-center rounded-md border bg-slate-50 font-mono text-[11px] font-bold text-slate-500 shadow-2xs">
              {key}
            </kbd>
            <span className="text-base">{label}</span>
          </div>
          <span className="mt-1 block text-xs font-semibold text-slate-400">{hint}</span>
        </button>
      ))}
    </div>
  );
}

export function ScheduledStudy({ cards, title, onRate, onBack }: { cards: Card[]; title: string; onRate: (cardId: string, rating: Rating) => Promise<void>; onBack: () => void }) {
  const [ids] = useState(() => cards.map((card) => card.id));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const card = cards.find((candidate) => candidate.id === ids[index]);
  const done = index >= ids.length;

  async function rate(rating: Rating) {
    if (!card || busy) return;
    setBusy(true);
    try {
      await onRate(card.id, rating);
      setIndex((current) => current + 1);
      setRevealed(false);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (done || !card) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        setRevealed((prev) => !prev);
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        rate("again");
        return;
      }
      if (event.key === "2") {
        event.preventDefault();
        rate("hard");
        return;
      }
      if (event.key === "3") {
        event.preventDefault();
        rate("good");
        return;
      }
      if (event.key === "4") {
        event.preventDefault();
        rate("easy");
        return;
      }

      if (event.key.toLowerCase() === "r" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        speak(card);
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [done, card, revealed, busy]);

  return (
    <div className="mx-auto max-w-2xl">
      <ModeHeader title="Ôn theo lịch" subtitle={`${title} · chỉ các thẻ đã đến hạn`} onBack={onBack} />
      {done || !card ? (
        <Completion title="Hoàn thành phiên ôn!" detail="Lịch FSRS và lịch sử ôn đã được cập nhật." onBack={onBack} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Progress value={(index / ids.length) * 100} />
            <b className="whitespace-nowrap text-sm text-slate-500">{index + 1} / {ids.length}</b>
          </div>

          {/* Quizlet-style 3D Flashcard */}
          <div
            className="perspective-1000 w-full min-h-[420px] cursor-pointer select-none"
            onClick={() => setRevealed((value) => !value)}
            role="button"
            tabIndex={0}
            aria-label="Thẻ ghi nhớ. Bấm phím Space hoặc nhấp chuột để lật thẻ."
          >
            <div
              className={`relative min-h-[420px] w-full rounded-[30px] transition-transform duration-500 transform-style-3d shadow-xl hover:shadow-2xl ${
                revealed ? "rotate-y-180" : ""
              }`}
            >
              {/* Mặt trước */}
              <div className="absolute inset-0 flex flex-col justify-between rounded-[30px] border border-slate-200/80 bg-white p-7 text-center backface-hidden sm:p-10">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[.18em] text-[#6c63ff]">
                  <span>Ôn theo lịch FSRS</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <kbd>Space</kbd> để lật
                  </span>
                </div>
                <div className="my-auto py-6">
                  <div className="flex items-center justify-center gap-3">
                    <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">{card.front}</h2>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        speak(card);
                      }}
                      aria-label={`Phát âm ${card.front}`}
                      className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                    >
                      <Volume2 size={22} />
                    </button>
                  </div>
                  <WordMeta card={card} />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                  <span>Nhấp thẻ hoặc bấm</span>
                  <kbd className="rounded border bg-slate-100 px-2 py-0.5 font-mono text-slate-700 shadow-2xs">Space</kbd>
                  <span>để hiện đáp án</span>
                </div>
              </div>

              {/* Mặt sau */}
              <div className="absolute inset-0 flex flex-col justify-between rounded-[30px] border border-emerald-200 bg-gradient-to-b from-white via-white to-emerald-50/40 p-7 text-center backface-hidden rotate-y-180 sm:p-10">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[.18em] text-[#17a673]">
                  <span>Đáp án (Mặt sau)</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <kbd>Space</kbd> lật lại
                  </span>
                </div>
                <div className="my-auto py-6">
                  <p className="text-3xl font-black text-[#17a673] sm:text-4xl">{card.back}</p>
                  <WordMeta card={card} />
                  {card.example && (
                    <div className="mt-5 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                      <p className="text-sm italic text-slate-600">“{card.example}”</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400">
                  <span>Bấm phím số</span>
                  <kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">1</kbd>
                  <kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">2</kbd>
                  <kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">3</kbd>
                  <kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">4</kbd>
                  <span>để đánh giá</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            {!revealed ? (
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button
                  onClick={() => setRevealed(true)}
                  className="h-14 flex-1 rounded-2xl text-base font-black bg-[#6c63ff] hover:bg-[#5b52f5] shadow-md"
                >
                  Hiện đáp án <kbd className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs font-mono">Space</kbd>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                  <span>Đánh giá mức độ ghi nhớ:</span>
                  <span>Phím tắt [1 - 4]</span>
                </div>
                <RatingButtons onRate={rate} disabled={busy} />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl bg-white/70 border border-slate-200/60 py-2.5 px-4 text-xs font-semibold text-slate-500 shadow-2xs">
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">Space</kbd> Lật thẻ</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">1</kbd> Quên</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">2</kbd> Khó</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">3</kbd> Tốt</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">4</kbd> Dễ</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">R</kbd> Nghe</span>
          </div>
        </>
      )}
    </div>
  );
}

export function FlashcardsMode({ cards, title, onBack, onToggleDifficult, onRate }: {
  cards: Card[];
  title: string;
  onBack: () => void;
  onToggleDifficult: (card: Card) => Promise<void>;
  onRate: (cardId: string, rating: Rating) => Promise<void>;
}) {
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
  const card = cards.find((candidate) => candidate.id === ids[index]);

  useEffect(() => {
    if (index >= ids.length && ids.length) setIndex(ids.length - 1);
  }, [ids.length, index]);

  function next() {
    if (!ids.length) return;
    if (index + 1 >= ids.length) setDone(true);
    else setIndex((current) => current + 1);
    setFlipped(false);
  }
  function previous() {
    setDone(false);
    setIndex((current) => Math.max(0, current - 1));
    setFlipped(false);
  }
  function restart(shuffled = randomOrder, hardOnly = onlyDifficult) {
    const source = (hardOnly ? cards.filter((item) => item.isDifficult) : cards).map((item) => item.id);
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
  async function rate(rating: Rating) {
    if (!card) return;
    setBusy(true);
    try {
      await onRate(card.id, rating);
      next();
    } finally {
      setBusy(false);
    }
  }
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

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.tagName === "SELECT")
      ) {
        return;
      }

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
          speak(card);
        }
        return;
      }
      if (event.key.toLowerCase() === "f") {
        if (card) {
          event.preventDefault();
          onToggleDifficult(card);
        }
        return;
      }

      if (recordFsrs && card && !busy) {
        if (event.key === "1") {
          event.preventDefault();
          rate("again");
          return;
        }
        if (event.key === "2") {
          event.preventDefault();
          rate("hard");
          return;
        }
        if (event.key === "3") {
          event.preventDefault();
          rate("good");
          return;
        }
        if (event.key === "4") {
          event.preventDefault();
          rate("easy");
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [card, recordFsrs, busy, ids.length, index, done]);

  const frontPrimary = direction === "en-vi";
  return (
    <div className="mx-auto max-w-3xl">
      <ModeHeader title="Flashcards · Học tự do" subtitle={`${title} · không tự thay đổi lịch FSRS`} onBack={onBack} />
      <div className="mb-4 grid gap-2 rounded-2xl border bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Control label="Mặt trước">
          <select value={direction} onChange={(event) => { setDirection(event.target.value as Direction); setFlipped(false); }} className="h-9 w-full rounded-lg border bg-white px-2 text-sm font-semibold">
            <option value="en-vi">English → Vietnamese</option>
            <option value="vi-en">Vietnamese → English</option>
          </select>
        </Control>
        <Toggle label="Xáo trộn" checked={randomOrder} onChange={toggleOrder} />
        <Toggle label="Chỉ thẻ khó" checked={onlyDifficult} onChange={(checked) => { setOnlyDifficult(checked); restart(randomOrder, checked); }} />
        <Toggle label="Ghi vào FSRS" checked={recordFsrs} onChange={setRecordFsrs} />
      </div>

      {!ids.length ? (
        <EmptyState title={onlyDifficult ? "Chưa có thẻ được đánh dấu Khó" : "Bộ thẻ đang trống"} onBack={onBack} />
      ) : done ? (
        <div className="rounded-[28px] border bg-white p-7 text-center shadow-sm">
          <Check className="mx-auto text-[#17a673]" size={54} />
          <h2 className="mt-4 text-2xl font-black">Đã xem hết {ids.length} thẻ</h2>
          <p className="mt-2 text-slate-500">Bạn có thể học lại ngay mà không cần chờ đến hạn.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button onClick={() => restart(false, false)}><RotateCcw />Học lại từ đầu</Button>
            <Button variant="outline" onClick={() => restart(true, false)}><Shuffle />Xáo trộn và học lại</Button>
            <Button variant="outline" disabled={!cards.some((item) => item.isDifficult)} onClick={() => restart(randomOrder, true)}><Flag />Chỉ học thẻ khó</Button>
            <Button variant="outline" onClick={onBack}><ChevronLeft />Trở về bộ thẻ</Button>
          </div>
        </div>
      ) : card ? (
        <>
          <div className="mb-3 flex items-center gap-3">
            <Progress value={((index + 1) / ids.length) * 100} />
            <b className="whitespace-nowrap text-sm text-slate-500">{index + 1} / {ids.length}</b>
          </div>

          {/* Quizlet 3D Flashcard container */}
          <div
            className="perspective-1000 w-full min-h-[420px] cursor-pointer select-none"
            onClick={() => setFlipped((value) => !value)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            role="button"
            tabIndex={0}
            aria-label="Thẻ ghi nhớ. Bấm phím Space để lật thẻ."
          >
            <div
              className={`relative min-h-[420px] w-full rounded-[30px] transition-transform duration-500 transform-style-3d shadow-xl hover:shadow-2xl ${
                flipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Mặt trước */}
              <div className="absolute inset-0 flex flex-col justify-between rounded-[30px] border border-slate-200/80 bg-white p-7 text-center backface-hidden sm:p-10">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[.18em] text-[#6c63ff]">
                  <span>{frontPrimary ? "Tiếng Anh" : "Tiếng Việt"}</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <kbd>Space</kbd> để lật
                  </span>
                </div>
                <div className="my-auto py-6">
                  {frontPrimary ? (
                    <div>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-black text-slate-900 sm:text-4xl">{card.front}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(card);
                          }}
                          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          aria-label={`Phát âm ${card.front}`}
                        >
                          <Volume2 size={22} />
                        </button>
                      </div>
                      <WordMeta card={card} />
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-black text-slate-900 sm:text-4xl">{card.back}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDifficult(card);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition ${
                      card.isDifficult ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    <Flag size={14} />
                    {card.isDifficult ? "Đã đánh dấu Khó" : "Đánh dấu Khó"}
                    <kbd className="ml-1 text-[10px] font-mono opacity-60">[F]</kbd>
                  </button>
                  <span className="text-xs font-bold text-slate-400">
                    Bấm <kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">Space</kbd> để lật
                  </span>
                </div>
              </div>

              {/* Mặt sau */}
              <div className="absolute inset-0 flex flex-col justify-between rounded-[30px] border border-indigo-200 bg-gradient-to-b from-white via-white to-indigo-50/30 p-7 text-center backface-hidden rotate-y-180 sm:p-10">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-[.18em] text-[#6258ef]">
                  <span>{frontPrimary ? "Tiếng Việt (Nghĩa)" : "Tiếng Anh"}</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <kbd>Space</kbd> lật lại
                  </span>
                </div>
                <div className="my-auto py-6">
                  {frontPrimary ? (
                    <div>
                      <span className="block text-3xl font-black text-[#17a673] sm:text-4xl">{card.back}</span>
                      {card.example && (
                        <div className="mt-5 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                          <p className="text-sm italic text-slate-600">“{card.example}”</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-black text-slate-900 sm:text-4xl">{card.front}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(card);
                          }}
                          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          aria-label={`Phát âm ${card.front}`}
                        >
                          <Volume2 size={22} />
                        </button>
                      </div>
                      <WordMeta card={card} />
                      {card.example && (
                        <div className="mt-5 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                          <p className="text-sm italic text-slate-600">“{card.example}”</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDifficult(card);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition ${
                      card.isDifficult ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    <Flag size={14} />
                    {card.isDifficult ? "Đã đánh dấu Khó" : "Đánh dấu Khó"}
                    <kbd className="ml-1 text-[10px] font-mono opacity-60">[F]</kbd>
                  </button>
                  <span className="text-xs font-bold text-slate-400">
                    Bấm <kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">Space</kbd> để lật lại
                  </span>
                </div>
              </div>
            </div>
          </div>

          {recordFsrs && flipped && (
            <div className="mt-4">
              <p className="mb-2 text-center text-xs font-bold text-amber-700">Lựa chọn dưới đây sẽ cập nhật lịch FSRS (Phím tắt 1 - 4).</p>
              <RatingButtons onRate={rate} disabled={busy} />
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button variant="outline" disabled={index === 0} onClick={previous} className="rounded-xl">
              <ArrowLeft /> Thẻ trước <kbd className="ml-1 hidden font-mono text-xs opacity-60 sm:inline">←</kbd>
            </Button>
            <Button variant="outline" onClick={() => restart(true, onlyDifficult)} className="rounded-xl">
              <Shuffle /> Xáo trộn
            </Button>
            <Button onClick={next} className="rounded-xl">
              Tiếp theo <kbd className="ml-1 hidden font-mono text-xs opacity-60 sm:inline">→</kbd> <ArrowRight />
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl bg-white/70 border border-slate-200/60 py-2.5 px-4 text-xs font-semibold text-slate-500 shadow-2xs">
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">Space</kbd> Lật</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">←</kbd><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">→</kbd> Chuyển thẻ</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">R</kbd> Phát âm</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">F</kbd> Đánh dấu Khó</span>
            {recordFsrs && <span className="flex items-center gap-1"><kbd className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">1-4</kbd> Đánh giá</span>}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function LearnMode({ cards, title, onBack, onBatchReview }: { cards: Card[]; title: string; onBack: () => void; onBatchReview: (results: ReviewResult[]) => Promise<void> }) {
  const [directionChoice, setDirectionChoice] = useState<DirectionChoice>("both");
  const [queue, setQueue] = useState(() => cards.map((card) => card.id));
  const [mastery, setMastery] = useState<Record<string, number>>({});
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; expected: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const card = cards.find((candidate) => candidate.id === queue[0]);
  const direction = resolveDirection(directionChoice, attempts);
  const kind: QuestionKind = attempts % 2 === 0 ? "multiple-choice" : "typing";
  const choices = useMemo(() => card ? choicesFor(card, cards, direction) : [], [card, cards, direction]);
  const remaining = cards.filter((item) => (mastery[item.id] || 0) < 2).length;

  function answer(value: string) {
    if (!card || feedback) return;
    const expected = answerFor(card, direction);
    const correct = normalizeAnswer(value) === normalizeAnswer(expected);
    setTyped(value);
    setFeedback({ correct, expected });
    if (correct) setCorrectCount((count) => count + 1);
    else {
      setWrongCount((count) => count + 1);
      setMistakes((items) => items.includes(card.id) ? items : [...items, card.id]);
    }
  }

  function continueLearning() {
    if (!card || !feedback) return;
    const rest = queue.slice(1);
    if (feedback.correct) {
      const nextMastery = (mastery[card.id] || 0) + 1;
      setMastery((current) => ({ ...current, [card.id]: nextMastery }));
      setQueue(nextMastery >= 2 ? rest : [...rest, card.id]);
    } else {
      setQueue(rest.length ? [rest[0], card.id, ...rest.slice(1)] : [card.id]);
    }
    setAttempts((count) => count + 1);
    setTyped("");
    setFeedback(null);
  }

  async function saveToFsrs() {
    setBusy(true);
    try {
      await onBatchReview(cards.map((item) => ({ cardId: item.id, rating: mistakes.includes(item.id) ? "hard" : "good" })));
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ModeHeader title="Learn" subtitle={`${title} · mỗi thẻ cần đúng 2 lần`} onBack={onBack} trailing={
        <select value={directionChoice} onChange={(event) => setDirectionChoice(event.target.value as DirectionChoice)} className="h-10 rounded-xl border bg-white px-3 text-sm font-bold">
          <option value="both">Hai chiều</option><option value="en-vi">English → Vietnamese</option><option value="vi-en">Vietnamese → English</option>
        </select>
      } />
      {!cards.length ? <EmptyState title="Bộ thẻ đang trống" onBack={onBack} /> : !card ? (
        <div className="rounded-[28px] border bg-white p-7 text-center shadow-sm">
          <Check className="mx-auto text-[#17a673]" size={54} />
          <h2 className="mt-4 text-2xl font-black">Hoàn thành Learn</h2>
          <p className="mt-2 text-slate-500">Đúng {correctCount} · Sai {wrongCount}. Kết quả chưa thay đổi lịch FSRS.</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button disabled={busy || saved} onClick={saveToFsrs}>{saved ? "Đã ghi vào FSRS" : busy ? "Đang ghi..." : "Ghi kết quả vào FSRS"}</Button>
            <Button variant="outline" onClick={onBack}>Trở về bộ thẻ</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <Stat label="Đúng" value={correctCount} color="#17a673" /><Stat label="Sai" value={wrongCount} color="#ef4444" /><Stat label="Còn lại" value={remaining} color="#6c63ff" />
          </div>
          <Progress value={cards.length ? ((cards.length - remaining) / cards.length) * 100 : 0} />
          <div className="mt-4 rounded-[28px] border bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase tracking-[.15em] text-[#6c63ff]">{kind === "multiple-choice" ? "Trắc nghiệm" : "Gõ đáp án"} · {direction === "en-vi" ? "EN → VI" : "VI → EN"}</span><span className="text-xs font-bold text-slate-400">Đúng {mastery[card.id] || 0}/2</span></div>
            <h2 className="my-9 text-center text-2xl font-black sm:text-3xl">{questionFor(card, direction)}</h2>
            {direction === "en-vi" && <div className="-mt-6 mb-7"><WordMeta card={card} /></div>}
            {kind === "multiple-choice" ? (
              <div className="grid gap-2 sm:grid-cols-2">{choices.map((choice) => <button key={choice} disabled={Boolean(feedback)} onClick={() => answer(choice)} className={`rounded-2xl border p-4 text-left font-bold transition ${feedback && normalizeAnswer(choice) === normalizeAnswer(feedback.expected) ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "bg-white hover:border-[#6c63ff]"}`}>{choice}</button>)}</div>
            ) : (
              <form onSubmit={(event) => { event.preventDefault(); answer(typed); }} className="grid gap-3">
                <Input autoFocus disabled={Boolean(feedback)} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Nhập câu trả lời..." className="h-12 text-base" />
                <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={Boolean(feedback)} onClick={() => answer("")}><HelpCircle />Tôi không biết</Button><Button disabled={Boolean(feedback) || !typed.trim()}>Kiểm tra</Button></div>
              </form>
            )}
            {feedback && <Feedback correct={feedback.correct} expected={feedback.expected} onContinue={continueLearning} />}
          </div>
        </>
      )}
    </div>
  );
}

type TestQuestion = { key: string; cardId: string; kind: QuestionKind; direction: Direction; choices: string[] };

export function TestMode({ cards, title, onBack, onBatchReview }: { cards: Card[]; title: string; onBack: () => void; onBatchReview: (results: ReviewResult[]) => Promise<void> }) {
  const [count, setCount] = useState(Math.min(10, Math.max(1, cards.length)));
  const [kindChoice, setKindChoice] = useState<QuestionKind | "mixed">("mixed");
  const [directionChoice, setDirectionChoice] = useState<DirectionChoice>("both");
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function createTest(source = cards) {
    const chosen = shuffle(source).slice(0, Math.min(count, source.length));
    setQuestions(chosen.map((card, index) => {
      const direction = resolveDirection(directionChoice, index);
      const kind = kindChoice === "mixed" ? (index % 2 === 0 ? "multiple-choice" : "typing") : kindChoice;
      return { key: crypto.randomUUID(), cardId: card.id, kind, direction, choices: choicesFor(card, cards, direction) };
    }));
    setAnswers({});
    setSubmitted(false);
    setSaved(false);
  }

  const results = questions.map((question) => {
    const card = cards.find((candidate) => candidate.id === question.cardId)!;
    const expected = answerFor(card, question.direction);
    const answer = answers[question.key] || "";
    return { question, card, expected, answer, correct: normalizeAnswer(answer) === normalizeAnswer(expected) };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const wrongCards = results.filter((result) => !result.correct).map((result) => result.card);

  return (
    <div className="mx-auto max-w-4xl">
      <ModeHeader title="Test" subtitle={`${title} · kết quả chỉ ghi vào FSRS khi bạn chọn`} onBack={onBack} />
      {!cards.length ? <EmptyState title="Bộ thẻ đang trống" onBack={onBack} /> : !questions.length ? (
        <div className="rounded-[28px] border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black">Tạo bài kiểm tra</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Control label="Số câu"><Input type="number" min={1} max={cards.length} value={count} onChange={(event) => setCount(Math.max(1, Math.min(cards.length, Number(event.target.value) || 1)))} /></Control>
            <Control label="Dạng câu hỏi"><select value={kindChoice} onChange={(event) => setKindChoice(event.target.value as QuestionKind | "mixed")} className="h-10 rounded-lg border bg-white px-2"><option value="mixed">Kết hợp</option><option value="multiple-choice">Trắc nghiệm</option><option value="typing">Gõ đáp án</option></select></Control>
            <Control label="Chiều hỏi"><select value={directionChoice} onChange={(event) => setDirectionChoice(event.target.value as DirectionChoice)} className="h-10 rounded-lg border bg-white px-2"><option value="both">Cả hai</option><option value="en-vi">English → Vietnamese</option><option value="vi-en">Vietnamese → English</option></select></Control>
          </div>
          <Button onClick={() => createTest()} className="mt-6 w-full sm:w-auto">Bắt đầu làm bài<ChevronRight /></Button>
        </div>
      ) : submitted ? (
        <div className="space-y-4">
          <div className="rounded-[28px] bg-gradient-to-br from-[#6c63ff] to-[#5148df] p-7 text-center text-white shadow-lg">
            <p className="text-sm font-bold text-indigo-100">KẾT QUẢ</p><p className="mt-2 text-5xl font-black">{Math.round((correctCount / questions.length) * 100)}%</p><p className="mt-2">{correctCount} đúng · {questions.length - correctCount} sai</p>
          </div>
          {results.map((result, index) => <div key={result.question.key} className={`rounded-2xl border bg-white p-5 ${result.correct ? "border-emerald-200" : "border-red-200"}`}><div className="flex gap-3"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-black text-white ${result.correct ? "bg-emerald-500" : "bg-red-500"}`}>{index + 1}</span><div><p className="font-black">{questionFor(result.card, result.question.direction)}</p><p className="mt-2 text-sm text-slate-500">Bạn trả lời: <b className={result.correct ? "text-emerald-700" : "text-red-600"}>{result.answer || "(bỏ trống)"}</b></p>{!result.correct && <p className="mt-1 text-sm text-slate-500">Đáp án đúng: <b className="text-emerald-700">{result.expected}</b></p>}</div></div></div>)}
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" disabled={!wrongCards.length} onClick={() => createTest(wrongCards)}>Kiểm tra lại câu sai</Button>
            <Button variant="outline" onClick={() => { setQuestions([]); setSubmitted(false); }}>Tạo bài mới</Button>
            <Button disabled={saved || saving} onClick={async () => { setSaving(true); try { await onBatchReview(results.map((result) => ({ cardId: result.card.id, rating: result.correct ? "good" : "again" }))); setSaved(true); } finally { setSaving(false); } }}>{saved ? "Đã ghi vào FSRS" : saving ? "Đang ghi..." : "Ghi kết quả vào FSRS"}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} className="space-y-4">
          {questions.map((question, index) => {
            const card = cards.find((candidate) => candidate.id === question.cardId)!;
            return <div key={question.key} className="rounded-[24px] border bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black text-[#6c63ff]">CÂU {index + 1} · {question.kind === "multiple-choice" ? "TRẮC NGHIỆM" : "GÕ ĐÁP ÁN"}</p><h3 className="my-5 text-xl font-black">{questionFor(card, question.direction)}</h3>{question.kind === "multiple-choice" ? <div className="grid gap-2 sm:grid-cols-2">{question.choices.map((choice) => <label key={choice} className={`cursor-pointer rounded-xl border p-3 font-semibold ${answers[question.key] === choice ? "border-[#6c63ff] bg-[#f0efff]" : "bg-white"}`}><input className="mr-2" type="radio" name={question.key} checked={answers[question.key] === choice} onChange={() => setAnswers((current) => ({ ...current, [question.key]: choice }))} />{choice}</label>)}</div> : <Input value={answers[question.key] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))} placeholder="Nhập câu trả lời..." />}</div>;
          })}
          <Button className="h-12 w-full">Nộp bài</Button>
        </form>
      )}
    </div>
  );
}

type MatchTile = { key: string; cardId: string; kind: "front" | "back"; label: string };

export function MatchMode({ cards, title, onBack }: { cards: Card[]; title: string; onBack: () => void }) {
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  function reset() {
    const chosen = shuffle(cards).slice(0, 6);
    setTiles(shuffle(chosen.flatMap((card) => [
      { key: `${card.id}-front`, cardId: card.id, kind: "front" as const, label: card.front },
      { key: `${card.id}-back`, cardId: card.id, kind: "back" as const, label: card.back },
    ])));
    setSelected([]);
    setMatched([]);
    setWrong([]);
    setMistakes(0);
    setElapsed(0);
    setStartedAt(Date.now());
  }

  useEffect(reset, [cards]);
  const complete = Boolean(tiles.length) && matched.length === tiles.length;
  useEffect(() => {
    if (complete || !tiles.length) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [complete, startedAt, tiles.length]);

  function choose(tile: MatchTile) {
    if (matched.includes(tile.key) || selected.includes(tile.key) || selected.length > 1) return;
    if (!selected.length) return setSelected([tile.key]);
    const first = tiles.find((candidate) => candidate.key === selected[0])!;
    if (first.cardId === tile.cardId && first.kind !== tile.kind) {
      setMatched((items) => [...items, first.key, tile.key]);
      setSelected([]);
    } else {
      setMistakes((count) => count + 1);
      setSelected([first.key, tile.key]);
      setWrong([first.key, tile.key]);
      window.setTimeout(() => { setSelected([]); setWrong([]); }, 550);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ModeHeader title="Match" subtitle={`${title} · tối đa 6 cặp · không thay đổi FSRS`} onBack={onBack} trailing={<span className="rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">⏱ {elapsed}s</span>} />
      {!cards.length ? <EmptyState title="Bộ thẻ đang trống" onBack={onBack} /> : complete ? (
        <div className="rounded-[28px] border bg-white p-8 text-center shadow-sm"><Check className="mx-auto text-[#17a673]" size={56} /><h2 className="mt-4 text-3xl font-black">Ghép xong!</h2><p className="mt-2 text-slate-500">Thời gian: {elapsed} giây · Ghép sai: {mistakes} lần</p><div className="mt-6 flex justify-center gap-2"><Button onClick={reset}><RotateCcw />Chơi lại</Button><Button variant="outline" onClick={onBack}>Trở về</Button></div></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const isMatched = matched.includes(tile.key);
            const isSelected = selected.includes(tile.key);
            const isWrong = wrong.includes(tile.key);
            return <button key={tile.key} disabled={isMatched} onClick={() => choose(tile)} className={`min-h-28 rounded-2xl border p-3 text-sm font-black transition sm:min-h-32 sm:text-base ${isMatched ? "pointer-events-none scale-90 opacity-0" : isWrong ? "border-red-400 bg-red-50 text-red-700" : isSelected ? "border-[#6c63ff] bg-[#f0efff] text-[#554ceb] shadow-md" : "bg-white hover:-translate-y-0.5 hover:shadow-md"}`}>{tile.label}</button>;
          })}
        </div>
      )}
    </div>
  );
}

function Feedback({ correct, expected, onContinue }: { correct: boolean; expected: string; onContinue: () => void }) {
  return <div className={`mt-5 rounded-2xl p-4 ${correct ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}><div className="flex items-start gap-3">{correct ? <Check className="shrink-0" /> : <X className="shrink-0" />}<div className="flex-1"><b>{correct ? "Chính xác!" : "Chưa đúng"}</b>{!correct && <p className="mt-1 text-sm">Đáp án: <b>{expected}</b></p>}</div><Button type="button" size="sm" onClick={onContinue}>Tiếp tục<ChevronRight /></Button></div></div>;
}

function Completion({ title, detail, onBack }: { title: string; detail: string; onBack: () => void }) {
  return <div className="rounded-[30px] border bg-white p-10 text-center shadow-sm"><span className="mx-auto grid size-20 place-items-center rounded-full bg-[#e7faf2] text-[#17a673]"><Check size={40} /></span><h2 className="mt-6 text-3xl font-black">{title}</h2><p className="mt-2 text-slate-500">{detail}</p><Button onClick={onBack} className="mt-6">Quay lại</Button></div>;
}

function EmptyState({ title, onBack }: { title: string; onBack: () => void }) {
  return <div className="rounded-[28px] border border-dashed bg-white p-10 text-center"><p className="text-xl font-black">{title}</p><p className="mt-2 text-sm text-slate-500">Hãy thêm thẻ hoặc đổi lựa chọn để tiếp tục.</p><Button variant="outline" onClick={onBack} className="mt-5"><ChevronLeft />Quay lại</Button></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[#6c63ff]" /></label>;
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-slate-500">{label}{children}</label>;
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="rounded-2xl border bg-white p-3 text-center"><b className="block text-2xl" style={{ color }}>{value}</b><span className="text-xs font-bold text-slate-400">{label}</span></div>;
}
