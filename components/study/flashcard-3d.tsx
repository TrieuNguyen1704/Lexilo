"use client";

import type { TouchEvent } from "react";
import { Volume2 } from "lucide-react";
import { speakCard, triggerHaptic } from "@/lib/services/speech";
import type { Card, Direction } from "@/types/lexilo";
import { WordMeta } from "./study-shared";

interface Flashcard3DProps {
  card: Card;
  flipped: boolean;
  direction?: Direction;
  frontLabel: string;
  backLabel: string;
  backAccentVariant?: "emerald" | "indigo";
  onFlip: () => void;
  onTouchStart?: (event: TouchEvent) => void;
  onTouchEnd?: (event: TouchEvent) => void;
  footerContent?: React.ReactNode;
  backFooterContent?: React.ReactNode;
}

function SpeakButton({ card }: { card: Card }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speakCard(card);
      }}
      aria-label={`Phát âm ${card.front}`}
      className="tap-press grid size-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-[#6d28d9] transition hover:bg-violet-100"
    >
      <Volume2 size={20} />
    </button>
  );
}

function ExampleBox({ example }: { example: string }) {
  if (!example) return null;
  return (
    <div className="clay-surface mt-3.5 rounded-2xl p-3 sm:mt-5 sm:p-3.5">
      <p className="text-xs font-medium break-words text-slate-700 italic sm:text-sm">
        “{example}”
      </p>
    </div>
  );
}

export function Flashcard3D({
  card,
  flipped,
  direction = "en-vi",
  frontLabel,
  backLabel,
  backAccentVariant = "indigo",
  onFlip,
  onTouchStart,
  onTouchEnd,
  footerContent,
  backFooterContent,
}: Flashcard3DProps) {
  const showEnglishOnFront = direction === "en-vi";
  const backBorderAndGradient =
    backAccentVariant === "emerald"
      ? "border-emerald-200 bg-gradient-to-b from-white via-white to-emerald-50/45"
      : "border-violet-200 bg-gradient-to-b from-white via-white to-violet-50/40";
  const backLabelColor = backAccentVariant === "emerald" ? "text-[#047857]" : "text-[#6d28d9]";

  return (
    <div
      className="perspective-1000 min-h-[260px] w-full cursor-pointer rounded-[28px] select-none sm:min-h-[380px] sm:rounded-[32px]"
      onClick={() => {
        triggerHaptic(8);
        onFlip();
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="button"
      tabIndex={0}
      aria-label="Thẻ ghi nhớ. Bấm phím Space hoặc nhấp chuột để lật thẻ."
    >
      <div
        className={`transform-style-3d relative min-h-[260px] w-full rounded-[28px] transition-transform duration-500 sm:min-h-[380px] sm:rounded-[32px] ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        <div
          className={`backface-hidden rotate-y-0 clay-card absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[28px] p-5 text-center sm:rounded-[32px] sm:p-9 ${
            flipped ? "pointer-events-none" : ""
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-extrabold tracking-[.14em] text-[#6d28d9] uppercase sm:text-xs">
            <span>{frontLabel}</span>
            <span className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[#f7f3fd] px-3 py-1 font-mono text-[11px] font-bold text-slate-600 sm:flex">
              <kbd>Space</kbd> để lật
            </span>
          </div>

          <div className="my-auto max-h-full overflow-y-auto py-3 sm:py-5">
            {showEnglishOnFront ? (
              <div>
                <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                  <h2 className="font-display text-2xl font-bold break-words text-slate-900 sm:text-4xl">
                    {card.front}
                  </h2>
                  <SpeakButton card={card} />
                </div>
                <WordMeta card={card} />
              </div>
            ) : (
              <div>
                <span className="font-display text-2xl font-bold break-words text-slate-900 sm:text-4xl">
                  {card.back}
                </span>
              </div>
            )}
          </div>

          {footerContent}
        </div>

        <div
          className={`backface-hidden rotate-y-180 clay-card absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[28px] p-5 text-center sm:rounded-[32px] sm:p-9 ${backBorderAndGradient} ${
            flipped ? "" : "pointer-events-none"
          }`}
        >
          <div
            className={`flex items-center justify-between text-[11px] font-extrabold tracking-[.14em] uppercase sm:text-xs ${backLabelColor}`}
          >
            <span>{backLabel}</span>
            <span className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[#f7f3fd] px-3 py-1 font-mono text-[11px] font-bold text-slate-600 sm:flex">
              <kbd>Space</kbd> lật lại
            </span>
          </div>

          <div className="my-auto max-h-full overflow-y-auto py-3 sm:py-5">
            {showEnglishOnFront ? (
              <div>
                <p className="font-display text-2xl font-bold break-words text-[#047857] sm:text-4xl">
                  {card.back}
                </p>
                {backAccentVariant === "emerald" && <WordMeta card={card} />}
                <ExampleBox example={card.example} />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                  <span className="font-display text-2xl font-bold break-words text-slate-900 sm:text-4xl">
                    {card.front}
                  </span>
                  <SpeakButton card={card} />
                </div>
                <WordMeta card={card} />
                <ExampleBox example={card.example} />
              </div>
            )}
          </div>

          {backFooterContent ?? footerContent}
        </div>
      </div>
    </div>
  );
}
