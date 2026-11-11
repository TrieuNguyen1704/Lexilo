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
      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
    >
      <Volume2 size={22} />
    </button>
  );
}

function ExampleBox({ example }: { example: string }) {
  if (!example) return null;
  return (
    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
      <p className="text-sm text-slate-600 italic">“{example}”</p>
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
      ? "border-emerald-200 bg-gradient-to-b from-white via-white to-emerald-50/40"
      : "border-indigo-200 bg-gradient-to-b from-white via-white to-indigo-50/30";
  const backLabelColor = backAccentVariant === "emerald" ? "text-[#17a673]" : "text-[#6258ef]";

  return (
    <div
      className="perspective-1000 min-h-[420px] w-full cursor-pointer select-none"
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
        className={`transform-style-3d relative min-h-[420px] w-full rounded-[30px] shadow-xl transition-transform duration-500 hover:shadow-2xl ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front Face */}
        <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-[30px] border border-slate-200/80 bg-white p-7 text-center sm:p-10">
          <div className="flex items-center justify-between text-xs font-black tracking-[.18em] text-[#6c63ff] uppercase">
            <span>{frontLabel}</span>
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-500">
              <kbd>Space</kbd> để lật
            </span>
          </div>

          <div className="my-auto py-6">
            {showEnglishOnFront ? (
              <div>
                <div className="flex items-center justify-center gap-3">
                  <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">{card.front}</h2>
                  <SpeakButton card={card} />
                </div>
                <WordMeta card={card} />
              </div>
            ) : (
              <div>
                <span className="text-3xl font-black text-slate-900 sm:text-4xl">{card.back}</span>
              </div>
            )}
          </div>

          {footerContent}
        </div>

        {/* Back Face */}
        <div
          className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-[30px] border p-7 text-center sm:p-10 ${backBorderAndGradient}`}
        >
          <div
            className={`flex items-center justify-between text-xs font-black tracking-[.18em] uppercase ${backLabelColor}`}
          >
            <span>{backLabel}</span>
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-500">
              <kbd>Space</kbd> lật lại
            </span>
          </div>

          <div className="my-auto py-6">
            {showEnglishOnFront ? (
              <div>
                <p className="text-3xl font-black text-[#17a673] sm:text-4xl">{card.back}</p>
                {backAccentVariant === "emerald" && <WordMeta card={card} />}
                <ExampleBox example={card.example} />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-black text-slate-900 sm:text-4xl">
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
