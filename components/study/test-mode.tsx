"use client";

import { useState } from "react";
import { ChevronRight, Loader2, Settings2, Sparkles } from "lucide-react";
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
import {
  generateTestWithAi,
  gradeAndSummarizeTestWithAi,
} from "@/lib/services/gemini";
import type { AiTestQuestion, AiTestSummary } from "@/types/ai";
import type { Card, DirectionChoice, Notice, QuestionKind } from "@/types/lexilo";
import {
  ModeHeader,
  type ReviewResult,
  StudyControl,
  StudyEmptyState,
} from "./study-shared";

interface TestModeProps {
  cards: Card[];
  title: string;
  geminiActive: boolean;
  geminiModel: string;
  onOpenGeminiSettings: () => void;
  onNotice: (kind: Notice["kind"], text: string) => void;
  onBack: () => void;
  onBatchReview: (results: ReviewResult[]) => Promise<void>;
}

export function TestMode({
  cards,
  title,
  geminiActive,
  geminiModel,
  onOpenGeminiSettings,
  onNotice,
  onBack,
  onBatchReview,
}: TestModeProps) {
  const [count, setCount] = useState(Math.min(10, Math.max(1, cards.length)));
  const [kindChoice, setKindChoice] = useState<QuestionKind | "mixed">("mixed");
  const [directionChoice, setDirectionChoice] = useState<DirectionChoice>("both");
  const [aiEngineOverride, setAiEngineOverride] = useState<boolean | null>(null);
  const useAiEngine = geminiActive && (aiEngineOverride ?? true);

  const [questions, setQuestions] = useState<AiTestQuestion[]>([]);
  const [testUsedAi, setTestUsedAi] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aiGrades, setAiGrades] = useState<
    Record<string, { isCorrect: boolean; feedback?: string }>
  >({});
  const [aiSummary, setAiSummary] = useState<AiTestSummary | null>(null);

  const [generating, setGenerating] = useState(false);
  const [grading, setGrading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function createTest(source = cards) {
    setAnswers({});
    setAiGrades({});
    setAiSummary(null);
    setSubmitted(false);
    setSaved(false);

    if (useAiEngine && geminiActive) {
      setGenerating(true);
      try {
        const aiGenerated = await generateTestWithAi({
          cards: source,
          count,
          kindChoice,
          directionChoice,
        });
        setQuestions(aiGenerated);
        setTestUsedAi(true);
        return;
      } catch (error) {
        onNotice("error", `${(error as Error).message} Đang dùng đề tiêu chuẩn.`);
      } finally {
        setGenerating(false);
      }
    }

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
          prompt: questionFor(card, direction),
          choices: choicesFor(card, cards, direction),
          expected: answerFor(card, direction),
        };
      }),
    );
    setTestUsedAi(false);
  }

  async function handleSubmitTest(event: React.FormEvent) {
    event.preventDefault();

    if (geminiActive && (testUsedAi || useAiEngine)) {
      setGrading(true);
      try {
        const payload = questions.map((q) => {
          const card = cards.find((c) => c.id === q.cardId)!;
          const userAnswer = answers[q.key] || "";
          const alreadyExact = normalizeAnswer(userAnswer) === normalizeAnswer(q.expected);
          return {
            key: q.key,
            word: card.front,
            meaning: card.back,
            prompt: q.prompt,
            expected: q.expected,
            userAnswer,
            kind: q.kind,
            alreadyExact,
          };
        });

        const graded = await gradeAndSummarizeTestWithAi(payload);
        setAiGrades(graded.gradesByKey);
        setAiSummary(graded.summary);
      } catch (error) {
        onNotice("error", (error as Error).message);
      } finally {
        setGrading(false);
      }
    }

    setSubmitted(true);
  }

  const results = questions.map((question) => {
    const card = cards.find((candidate) => candidate.id === question.cardId)!;
    const answer = answers[question.key] || "";
    const exactMatch = normalizeAnswer(answer) === normalizeAnswer(question.expected);
    const aiGrade = aiGrades[question.key];
    const correct =
      question.kind === "typing" && aiGrade && answer.trim() ? aiGrade.isCorrect : exactMatch;

    return {
      question,
      card,
      expected: question.expected,
      answer,
      correct,
      aiFeedback: aiGrade?.feedback,
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Tạo bài kiểm tra</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenGeminiSettings}
              className="h-9 gap-1.5 rounded-xl text-xs font-bold"
            >
              <Settings2 size={14} />
              {geminiActive ? `Gemini (${geminiModel})` : "Cài Gemini API Key"}
            </Button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <StudyControl label="Công cụ đề & chấm">
              <button
                type="button"
                onClick={() => {
                  if (!geminiActive) {
                    onOpenGeminiSettings();
                    return;
                  }
                  setAiEngineOverride(!useAiEngine);
                }}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-black transition ${
                  useAiEngine && geminiActive
                    ? "border-[#6366f1] bg-indigo-50 text-[#6366f1]"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Sparkles size={14} />
                {geminiActive
                  ? useAiEngine
                    ? "Gia sư Gemini AI"
                    : "Tiêu chuẩn (Tắt AI)"
                  : "Bật Gemini AI"}
              </button>
            </StudyControl>
          </div>

          <Button
            disabled={generating}
            onClick={() => void createTest()}
            className="mt-6 w-full sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gemini đang soạn đề...
              </>
            ) : (
              <>
                Bắt đầu làm bài
                <ChevronRight />
              </>
            )}
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

          {aiSummary && (
            <div className="rounded-[24px] border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 p-5 shadow-xs">
              <div className="mb-2 flex items-center gap-2 text-xs font-black tracking-wider text-[#6366f1] uppercase">
                <Sparkles size={15} />
                <span>Nhận xét từ Gia sư Gemini ({geminiModel})</span>
              </div>
              <p className="text-sm leading-relaxed font-semibold text-slate-800">
                {aiSummary.overallFeedback}
              </p>
              {aiSummary.weakAreas.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Cần ôn kỹ:</span>
                  {aiSummary.weakAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 rounded-xl bg-white/80 p-3 text-xs font-semibold text-indigo-800">
                💡 Mẹo học: {aiSummary.nextTip}
              </p>
            </div>
          )}

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
                <div className="min-w-0 flex-1">
                  <p className="font-black">{result.question.prompt}</p>
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
                  {(result.aiFeedback || result.question.explanation) && (
                    <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs font-medium text-slate-600">
                      💡 {result.aiFeedback || result.question.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              disabled={!wrongCards.length || generating}
              onClick={() => void createTest(wrongCards)}
            >
              Kiểm tra lại câu sai
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setQuestions([]);
                setSubmitted(false);
                setAiSummary(null);
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
        <form onSubmit={(event) => void handleSubmitTest(event)} className="space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.key}
              className="rounded-[24px] border bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="flex items-center gap-1.5 text-xs font-black text-[#6c63ff]">
                {testUsedAi && <Sparkles size={13} />}
                CÂU {index + 1} ·{" "}
                {question.kind === "multiple-choice" ? "TRẮC NGHIỆM" : "GÕ ĐÁP ÁN"}
              </p>
              <h3 className="my-4 text-xl font-black">{question.prompt}</h3>
              {question.hint && (
                <p className="mb-4 text-xs font-semibold text-indigo-600">
                  Gợi ý: {question.hint}
                </p>
              )}

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
          ))}
          <Button disabled={grading} className="h-12 w-full">
            {grading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gemini đang chấm bài &amp; phân tích...
              </>
            ) : (
              "Nộp bài"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
