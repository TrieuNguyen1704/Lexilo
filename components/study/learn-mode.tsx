"use client";

import { useMemo, useState } from "react";
import { Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  answerFor,
  choicesFor,
  normalizeAnswer,
  questionFor,
  resolveDirection,
} from "@/lib/domain/quiz";
import type { Card, DirectionChoice, QuestionKind } from "@/types/lexilo";
import {
  ModeHeader,
  type ReviewResult,
  StudyEmptyState,
  StudyFeedback,
  StudyStat,
  WordMeta,
} from "./study-shared";

interface LearnModeProps {
  cards: Card[];
  title: string;
  onBack: () => void;
  onBatchReview: (results: ReviewResult[]) => Promise<void>;
}

export function LearnMode({ cards, title, onBack, onBatchReview }: LearnModeProps) {
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
  const choices = useMemo(
    () => (card ? choicesFor(card, cards, direction) : []),
    [card, cards, direction],
  );
  const remaining = cards.filter((item) => (mastery[item.id] || 0) < 2).length;

  function answer(value: string) {
    if (!card || feedback) return;
    const expected = answerFor(card, direction);
    const correct = normalizeAnswer(value) === normalizeAnswer(expected);
    setTyped(value);
    setFeedback({ correct, expected });
    if (correct) {
      setCorrectCount((count) => count + 1);
    } else {
      setWrongCount((count) => count + 1);
      setMistakes((items) => (items.includes(card.id) ? items : [...items, card.id]));
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
      await onBatchReview(
        cards.map((item) => ({
          cardId: item.id,
          rating: mistakes.includes(item.id) ? "hard" : "good",
        })),
      );
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ModeHeader
        title="Learn"
        subtitle={`${title} · mỗi thẻ cần đúng 2 lần`}
        onBack={onBack}
        trailing={
          <select
            value={directionChoice}
            onChange={(event) => setDirectionChoice(event.target.value as DirectionChoice)}
            className="h-10 rounded-xl border bg-white px-3 text-sm font-bold"
          >
            <option value="both">Hai chiều</option>
            <option value="en-vi">English → Vietnamese</option>
            <option value="vi-en">Vietnamese → English</option>
          </select>
        }
      />

      {!cards.length ? (
        <StudyEmptyState title="Bộ thẻ đang trống" onBack={onBack} />
      ) : !card ? (
        <div className="rounded-[28px] border bg-white p-7 text-center shadow-sm">
          <Check className="mx-auto text-[#17a673]" size={54} />
          <h2 className="mt-4 text-2xl font-black">Hoàn thành Learn</h2>
          <p className="mt-2 text-slate-500">
            Đúng {correctCount} · Sai {wrongCount}. Kết quả chưa thay đổi lịch FSRS.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button disabled={busy || saved} onClick={saveToFsrs}>
              {saved ? "Đã ghi vào FSRS" : busy ? "Đang ghi..." : "Ghi kết quả vào FSRS"}
            </Button>
            <Button variant="outline" onClick={onBack}>
              Trở về bộ thẻ
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <StudyStat label="Đúng" value={correctCount} color="#17a673" />
            <StudyStat label="Sai" value={wrongCount} color="#ef4444" />
            <StudyStat label="Còn lại" value={remaining} color="#6c63ff" />
          </div>
          <Progress value={cards.length ? ((cards.length - remaining) / cards.length) * 100 : 0} />

          <div className="mt-4 rounded-[28px] border bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black tracking-[.15em] text-[#6c63ff] uppercase">
                {kind === "multiple-choice" ? "Trắc nghiệm" : "Gõ đáp án"} ·{" "}
                {direction === "en-vi" ? "EN → VI" : "VI → EN"}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Đúng {mastery[card.id] || 0}/2
              </span>
            </div>

            <h2 className="my-9 text-center text-2xl font-black sm:text-3xl">
              {questionFor(card, direction)}
            </h2>
            {direction === "en-vi" && (
              <div className="-mt-6 mb-7">
                <WordMeta card={card} />
              </div>
            )}

            {kind === "multiple-choice" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {choices.map((choice) => (
                  <button
                    key={choice}
                    disabled={Boolean(feedback)}
                    onClick={() => answer(choice)}
                    className={`rounded-2xl border p-4 text-left font-bold transition ${
                      feedback && normalizeAnswer(choice) === normalizeAnswer(feedback.expected)
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "bg-white hover:border-[#6c63ff]"
                    }`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  answer(typed);
                }}
                className="grid gap-3"
              >
                <Input
                  autoFocus
                  disabled={Boolean(feedback)}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  placeholder="Nhập câu trả lời..."
                  className="h-12 text-base"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(feedback)}
                    onClick={() => answer("")}
                  >
                    <HelpCircle />
                    Tôi không biết
                  </Button>
                  <Button disabled={Boolean(feedback) || !typed.trim()}>Kiểm tra</Button>
                </div>
              </form>
            )}

            {feedback && (
              <StudyFeedback
                correct={feedback.correct}
                expected={feedback.expected}
                onContinue={continueLearning}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
