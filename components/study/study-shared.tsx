"use client";

import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/lib/services/speech";
import type { Card, Rating } from "@/types/lexilo";

export interface ReviewResult {
  cardId: string;
  rating: Rating;
}

export function WordMeta({
  card,
  centered = true,
}: {
  card: Card;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "text-center" : ""}>
      {card.ipa && (
        <p className="mt-2 text-lg font-bold tracking-wide text-slate-500">{card.ipa}</p>
      )}
      {card.partOfSpeech && (
        <span className="mt-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold lowercase text-[#6d28d9]">
          {card.partOfSpeech}
        </span>
      )}
    </div>
  );
}

export function ModeHeader({
  title,
  subtitle,
  onBack,
  trailing,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 sm:mb-5 sm:gap-3">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          aria-label="Quay lại"
          className="tap-press size-9 shrink-0 rounded-xl border-[1.5px] border-[var(--border)] bg-white shadow-[var(--clay-shadow-soft)] sm:size-10 sm:rounded-2xl"
        >
          <ChevronLeft size={18} />
        </Button>
        <div className="min-w-0">
          <h1 className="font-display truncate text-xl font-bold text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-0.5 truncate text-xs font-semibold text-slate-600 sm:text-sm">
            {subtitle}
          </p>
        </div>
      </div>
      {trailing}
    </div>
  );
}

const FSRS_RATING_CHOICES: {
  rating: Rating;
  label: string;
  hint: string;
  styleClass: string;
  shortcut: string;
}[] = [
  {
    rating: "again",
    label: "Quên",
    hint: "10 phút",
    styleClass:
      "border-red-200 border-b-red-300 bg-red-50/90 text-red-700 hover:bg-red-100",
    shortcut: "1",
  },
  {
    rating: "hard",
    label: "Khó",
    hint: "1 ngày",
    styleClass:
      "border-amber-200 border-b-amber-300 bg-amber-50/90 text-amber-800 hover:bg-amber-100",
    shortcut: "2",
  },
  {
    rating: "good",
    label: "Tốt",
    hint: "Tự tính",
    styleClass:
      "border-emerald-200 border-b-emerald-300 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100",
    shortcut: "3",
  },
  {
    rating: "easy",
    label: "Dễ",
    hint: "4+ ngày",
    styleClass:
      "border-violet-200 border-b-violet-300 bg-violet-50/90 text-[#5b21b6] hover:bg-violet-100",
    shortcut: "4",
  },
];

export function RatingButtons({
  onRate,
  disabled,
}: {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {FSRS_RATING_CHOICES.map(({ rating, label, hint, styleClass, shortcut }) => (
        <button
          key={rating}
          disabled={disabled}
          onClick={() => {
            triggerHaptic(12);
            onRate(rating);
          }}
          className={`tap-press group relative rounded-2xl border-2 border-b-4 p-2.5 text-center font-black shadow-[0_6px_14px_-4px_rgba(15,23,42,0.08),inset_0_1.5px_0_rgba(255,255,255,0.85)] transition-all hover:-translate-y-0.5 active:translate-y-[2px] disabled:opacity-50 sm:p-3.5 ${styleClass}`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <kbd className="hidden size-5 items-center justify-center rounded-md border border-current/20 bg-white/85 font-mono text-[11px] font-bold shadow-2xs sm:inline-flex">
              {shortcut}
            </kbd>
            <span className="font-display text-sm font-bold sm:text-base">{label}</span>
          </div>
          <span className="mt-0.5 block text-[11px] font-bold opacity-85 sm:mt-1 sm:text-xs">
            {hint}
          </span>
        </button>
      ))}
    </div>
  );
}

export function StudyFeedback({
  correct,
  expected,
  aiNote,
  aiExplanation,
  onContinue,
}: {
  correct: boolean;
  expected: string;
  aiNote?: string;
  aiExplanation?: string;
  onContinue: () => void;
}) {
  return (
    <div
      className={`mt-3.5 sm:mt-5 rounded-2xl sm:rounded-3xl border-[1.5px] p-3 sm:p-4 shadow-[var(--clay-shadow-soft)] ${
        correct
          ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
          : "border-red-200 bg-red-50/90 text-red-900"
      }`}
    >
      <div className="flex flex-wrap items-start gap-2.5 sm:gap-3">
        <span
          className={`grid size-7 sm:size-8 shrink-0 place-items-center rounded-xl text-white ${
            correct ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {correct ? <Check size={16} strokeWidth={2.75} /> : <X size={16} strokeWidth={2.75} />}
        </span>
        <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
          <b className="font-display text-sm sm:text-base font-bold">{correct ? "Chính xác!" : "Chưa đúng"}</b>
          {!correct && (
            <p className="text-xs sm:text-sm font-medium break-words">
              Đáp án: <b className="font-extrabold">{expected}</b>
            </p>
          )}
          {aiNote && <p className="text-xs font-semibold opacity-90 break-words">{aiNote}</p>}
          {aiExplanation && (
            <p className="flex items-start gap-1.5 rounded-2xl bg-white/80 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 break-words">
              <Lightbulb size={14} className="mt-0.5 shrink-0 text-[#7c3aed]" />
              <span className="min-w-0">{aiExplanation}</span>
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onContinue}
          className="clay-cta h-9 sm:h-10 w-full sm:w-auto shrink-0 rounded-2xl bg-[#7c3aed] px-4 font-bold text-white hover:bg-[#6d28d9]"
        >
          Tiếp tục
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}

export function StudyCompletion({
  title,
  detail,
  onBack,
}: {
  title: string;
  detail: string;
  onBack: () => void;
}) {
  return (
    <div className="clay-card rounded-[32px] border-emerald-200/80 bg-gradient-to-b from-white via-white to-emerald-50/45 p-8 text-center sm:p-10">
      <div className="relative mx-auto flex h-32 w-32 items-center justify-center sm:h-36 sm:w-36">
        <div className="absolute inset-0 animate-pulse rounded-full bg-amber-300/45 blur-xl" />
        <Image
          src="/usagi-cheer.png"
          alt="Usagi Cổ Vũ"
          width={128}
          height={128}
          unoptimized
          className="relative h-28 w-28 animate-bounce object-contain drop-shadow-md select-none sm:h-32 sm:w-32"
        />
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-extrabold tracking-wider text-emerald-800 uppercase">
        <Check size={14} /> Hoàn tất
      </span>
      <h2 className="font-display mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed font-medium text-slate-600">
        {detail}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={onBack}
          className="clay-cta h-12 rounded-2xl bg-[#7c3aed] px-7 font-extrabold text-white hover:bg-[#6d28d9]"
        >
          Trở về trang chủ
        </Button>
      </div>
    </div>
  );
}

export function StudyEmptyState({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="clay-card rounded-[28px] border-dashed p-10 text-center">
      <p className="font-display text-xl font-bold text-slate-900">{title}</p>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Hãy thêm thẻ hoặc đổi lựa chọn để tiếp tục.
      </p>
      <Button
        variant="outline"
        onClick={onBack}
        className="mt-5 h-10 rounded-2xl border-[var(--border)] bg-white font-bold"
      >
        <ChevronLeft />
        Quay lại
      </Button>
    </div>
  );
}

export function StudyToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="clay-surface flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl px-3.5 text-sm font-bold text-slate-800">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#7c3aed]"
      />
    </label>
  );
}

export function StudyControl({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-extrabold tracking-wide text-slate-600 uppercase">
      {label}
      {children}
    </label>
  );
}

export function StudyStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="clay-card rounded-2xl p-2 text-center sm:rounded-3xl sm:p-3.5">
      <b className="font-display block text-lg font-bold sm:text-[28px]" style={{ color }}>
        {value}
      </b>
      <span className="text-[11px] font-bold text-slate-600 sm:text-xs">{label}</span>
    </div>
  );
}
