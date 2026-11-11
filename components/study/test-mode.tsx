"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  answerFor,
  choicesFor,
  normalizeAnswer,
  questionFor,
  resolveDirection,
  shuffle,
} from "@/lib/domain/quiz";
import type { Card, Direction, DirectionChoice, QuestionKind } from "@/types/lexilo";
import {
  ModeHeader,
  type ReviewResult,
  StudyControl,
  StudyEmptyState,
} from "./study-shared";

interface TestQuestion {
  key: string;
  cardId: string;
  kind: QuestionKind;
  direction: Direction;
  choices: string[];
}

interface TestModeProps {
  cards: Card[];
  title: string;
  onBack: () => void;
  onBatchReview: (results: ReviewResult[]) => Promise<void>;
}

export function TestMode({ cards, title, onBack, onBatchReview }: TestModeProps) {
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
    setQuestions(
      chosen.map((card, index) => {
        const direction = resolveDirection(directionChoice, index);
        const kind =
          kindChoice === "mixed"
            ? index % 2 === 0
              ? "multiple-choice"
              : "typing"
            : kindChoice;
        return {
          key: crypto.randomUUID(),
          cardId: card.id,
          kind,
          direction,
          choices: choicesFor(card, cards, direction),
        };
      }),
    );
    setAnswers({});
    setSubmitted(false);
    setSaved(false);
  }

  const results = questions.map((question) => {
    const card = cards.find((candidate) => candidate.id === question.cardId)!;
    const expected = answerFor(card, question.direction);
    const answer = answers[question.key] || "";
    return {
      question,
      card,
      expected,
      answer,
      correct: normalizeAnswer(answer) === normalizeAnswer(expected),
    };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const wrongCards = results.filter((result) => !result.correct).map((result) => result.card);

  return (
    <div className="mx-auto max-w-4xl">
      <ModeHeader
        title="Test"
        subtitle={`${title} · kết quả chỉ ghi vào FSRS khi bạn chọn`}
        onBack={onBack}
      />

      {!cards.length ? (
        <StudyEmptyState title="Bộ thẻ đang trống" onBack={onBack} />
      ) : !questions.length ? (
        <div className="rounded-[28px] border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black">Tạo bài kiểm tra</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StudyControl label="Số câu">
              <Input
                type="number"
                min={1}
                max={cards.length}
                value={count}
                onChange={(event) =>
                  setCount(Math.max(1, Math.min(cards.length, Number(event.target.value) || 1)))
                }
              />
            </StudyControl>
            <StudyControl label="Dạng câu hỏi">
              <select
                value={kindChoice}
                onChange={(event) =>
                  setKindChoice(event.target.value as QuestionKind | "mixed")
                }
                className="h-10 rounded-lg border bg-white px-2"
              >
                <option value="mixed">Kết hợp</option>
                <option value="multiple-choice">Trắc nghiệm</option>
                <option value="typing">Gõ đáp án</option>
              </select>
            </StudyControl>
            <StudyControl label="Chiều hỏi">
              <select
                value={directionChoice}
                onChange={(event) =>
                  setDirectionChoice(event.target.value as DirectionChoice)
                }
                className="h-10 rounded-lg border bg-white px-2"
              >
                <option value="both">Cả hai</option>
                <option value="en-vi">English → Vietnamese</option>
                <option value="vi-en">Vietnamese → English</option>
              </select>
            </StudyControl>
          </div>
          <Button onClick={() => createTest()} className="mt-6 w-full sm:w-auto">
            Bắt đầu làm bài
            <ChevronRight />
          </Button>
        </div>
      ) : submitted ? (
        <div className="space-y-4">
          <div className="rounded-[28px] bg-gradient-to-br from-[#6c63ff] to-[#5148df] p-7 text-center text-white shadow-lg">
            <p className="text-sm font-bold text-indigo-100">KẾT QUẢ</p>
            <p className="mt-2 text-5xl font-black">
              {Math.round((correctCount / questions.length) * 100)}%
            </p>
            <p className="mt-2">
              {correctCount} đúng · {questions.length - correctCount} sai
            </p>
          </div>

          {results.map((result, index) => (
            <div
              key={result.question.key}
              className={`rounded-2xl border bg-white p-5 ${
                result.correct ? "border-emerald-200" : "border-red-200"
              }`}
            >
              <div className="flex gap-3">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-black text-white ${
                    result.correct ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-black">
                    {questionFor(result.card, result.question.direction)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Bạn trả lời:{" "}
                    <b className={result.correct ? "text-emerald-700" : "text-red-600"}>
                      {result.answer || "(bỏ trống)"}
                    </b>
                  </p>
                  {!result.correct && (
                    <p className="mt-1 text-sm text-slate-500">
                      Đáp án đúng: <b className="text-emerald-700">{result.expected}</b>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              disabled={!wrongCards.length}
              onClick={() => createTest(wrongCards)}
            >
              Kiểm tra lại câu sai
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setQuestions([]);
                setSubmitted(false);
              }}
            >
              Tạo bài mới
            </Button>
            <Button
              disabled={saved || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onBatchReview(
                    results.map((result) => ({
                      cardId: result.card.id,
                      rating: result.correct ? "good" : "again",
                    })),
                  );
                  setSaved(true);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saved ? "Đã ghi vào FSRS" : saving ? "Đang ghi..." : "Ghi kết quả vào FSRS"}
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
          className="space-y-4"
        >
          {questions.map((question, index) => {
            const card = cards.find((candidate) => candidate.id === question.cardId)!;
            return (
              <div
                key={question.key}
                className="rounded-[24px] border bg-white p-5 shadow-sm sm:p-6"
              >
                <p className="text-xs font-black text-[#6c63ff]">
                  CÂU {index + 1} ·{" "}
                  {question.kind === "multiple-choice" ? "TRẮC NGHIỆM" : "GÕ ĐÁP ÁN"}
                </p>
                <h3 className="my-5 text-xl font-black">
                  {questionFor(card, question.direction)}
                </h3>
                {question.kind === "multiple-choice" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.choices.map((choice) => (
                      <label
                        key={choice}
                        className={`cursor-pointer rounded-xl border p-3 font-semibold ${
                          answers[question.key] === choice
                            ? "border-[#6c63ff] bg-[#f0efff]"
                            : "bg-white"
                        }`}
                      >
                        <input
                          className="mr-2"
                          type="radio"
                          name={question.key}
                          checked={answers[question.key] === choice}
                          onChange={() =>
                            setAnswers((current) => ({ ...current, [question.key]: choice }))
                          }
                        />
                        {choice}
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={answers[question.key] || ""}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.key]: event.target.value,
                      }))
                    }
                    placeholder="Nhập câu trả lời..."
                  />
                )}
              </div>
            );
          })}
          <Button className="h-12 w-full">Nộp bài</Button>
        </form>
      )}
    </div>
  );
}
