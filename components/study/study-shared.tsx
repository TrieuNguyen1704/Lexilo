"use client";

import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
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
        <p className="mt-2 text-lg font-semibold tracking-wide text-slate-400">{card.ipa}</p>
      )}
      {card.partOfSpeech && (
        <span className="mt-2 inline-flex rounded-full bg-[#f0efff] px-2.5 py-1 text-xs font-black lowercase text-[#6258ef]">
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
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack} aria-label="Quay lại">
          <ChevronLeft />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
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
    styleClass: "bg-red-50/80 hover:bg-red-100 text-red-600 border-red-200/90",
    shortcut: "1",
  },
  {
    rating: "hard",
    label: "Khó",
    hint: "1 ngày",
    styleClass: "bg-amber-50/80 hover:bg-amber-100 text-amber-700 border-amber-200/90",
    shortcut: "2",
  },
  {
    rating: "good",
    label: "Tốt",
    hint: "Tự tính",
    styleClass: "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border-emerald-200/90",
    shortcut: "3",
  },
  {
    rating: "easy",
    label: "Dễ",
    hint: "4+ ngày",
    styleClass: "bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200/90",
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
          className={`tap-press group relative rounded-2xl border-2 p-3 text-center font-black transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 sm:p-3.5 ${styleClass}`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <kbd className="inline-flex size-5 items-center justify-center rounded-md border bg-white/80 font-mono text-[11px] font-bold shadow-2xs">
              {shortcut}
            </kbd>
            <span className="text-base font-black">{label}</span>
          </div>
          <span className="mt-1 block text-xs font-semibold opacity-80">{hint}</span>
        </button>
      ))}
    </div>
  );
}

export function StudyFeedback({
  correct,
  expected,
  onContinue,
}: {
  correct: boolean;
  expected: string;
  onContinue: () => void;
}) {
  return (
    <div
      className={`mt-5 rounded-2xl p-4 ${
        correct ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      <div className="flex items-start gap-3">
        {correct ? <Check className="shrink-0" /> : <X className="shrink-0" />}
        <div className="flex-1">
          <b>{correct ? "Chính xác!" : "Chưa đúng"}</b>
          {!correct && (
            <p className="mt-1 text-sm">
              Đáp án: <b>{expected}</b>
            </p>
          )}
        </div>
        <Button type="button" size="sm" onClick={onContinue}>
          Tiếp tục
          <ChevronRight />
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
    <div className="rounded-[32px] border border-emerald-200/80 bg-gradient-to-b from-white via-white to-emerald-50/40 p-8 text-center shadow-md sm:p-10">
      <div className="relative mx-auto flex h-32 w-32 items-center justify-center sm:h-36 sm:w-36">
        <div className="absolute inset-0 animate-pulse rounded-full bg-amber-300/40 blur-xl" />
        <Image
          src="/usagi-cheer.png"
          alt="Usagi Cổ Vũ"
          width={128}
          height={128}
          unoptimized
          className="relative h-28 w-28 animate-bounce select-none object-contain drop-shadow-md sm:h-32 sm:w-32"
        />
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-black tracking-wider text-emerald-800 uppercase">
        <Check size={14} /> Hoàn tất
      </span>
      <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{detail}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={onBack}
          className="tap-press h-12 rounded-2xl bg-[#6366f1] px-7 font-black text-white shadow-md hover:bg-[#4f46e5]"
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
    <div className="rounded-[28px] border border-dashed bg-white p-10 text-center">
      <p className="text-xl font-black">{title}</p>
      <p className="mt-2 text-sm text-slate-500">Hãy thêm thẻ hoặc đổi lựa chọn để tiếp tục.</p>
      <Button variant="outline" onClick={onBack} className="mt-5">
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
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#6c63ff]"
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
    <label className="grid gap-1 text-xs font-black tracking-wide text-slate-500 uppercase">
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
    <div className="rounded-2xl border bg-white p-3 text-center">
      <b className="block text-2xl" style={{ color }}>
        {value}
      </b>
      <span className="text-xs font-bold text-slate-400">{label}</span>
    </div>
  );
}
