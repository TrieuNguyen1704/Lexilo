"use client";

import { useState } from "react";
import { ChevronRight, Lightbulb, Loader2, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  answerFor,
  choicesFor,
  isLocalFlexibleMatch,
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
    const strictMatch = normalizeAnswer(answer) === normalizeAnswer(question.expected);
    const flexibleMatch = isLocalFlexibleMatch(answer, question.expected);
    const aiGrade = aiGrades[question.key];
    const correct =
      question.kind === "typing"
        ? aiGrade && answer.trim()
          ? aiGrade.isCorrect
          : flexibleMatch
        : strictMatch;

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
        <div className="clay-card rounded-[26px] sm:rounded-[30px] p-4 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">Tạo bài kiểm tra</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenGeminiSettings}
              className="h-9 gap-1.5 rounded-2xl border-[var(--border)] bg-white text-xs font-extrabold text-slate-700"
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
                className="h-10 rounded-2xl border-[var(--border)] bg-white font-bold"
              />
            </StudyControl>
            <StudyControl label="Dạng câu hỏi">
              <select
                value={kindChoice}
                onChange={(event) =>
                  setKindChoice(event.target.value as QuestionKind | "mixed")
                }
                aria-label="Dạng câu hỏi"
                className="h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white px-3 text-sm font-bold text-slate-800"
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
                aria-label="Chiều hỏi"
                className="h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white px-3 text-sm font-bold text-slate-800"
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
                className={`tap-press flex h-10 items-center justify-center gap-1.5 rounded-2xl border-[1.5px] px-3 text-xs font-extrabold transition ${
                  useAiEngine && geminiActive
                    ? "border-violet-300 bg-violet-50 text-[#6d28d9]"
                    : "border-[var(--border)] bg-white text-slate-600 hover:bg-violet-50/40"
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
            className="clay-cta mt-6 h-12 w-full rounded-2xl bg-[#7c3aed] px-6 font-extrabold text-white hover:bg-[#6d28d9] sm:w-auto"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gemini đang soạn đề...
              </>
            ) : (
              <>
                Bắt đầu làm bài
                <ChevronRight size={18} />
              </>
            )}
          </Button>
        </div>
      ) : submitted ? (
        <div className="space-y-3.5 sm:space-y-4">
          <div className="rounded-[26px] sm:rounded-[30px] border border-violet-400/40 bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] p-5 sm:p-7 text-center text-white shadow-[0_18px_36px_-10px_rgba(109,40,217,0.42),inset_0_2px_0_rgba(255,255,255,0.28)]">
            <p className="text-xs font-extrabold tracking-widest text-violet-100 uppercase">
              Kết quả bài kiểm tra
            </p>
            <p className="font-display mt-2 text-4xl sm:text-5xl font-bold">
              {Math.round((correctCount / questions.length) * 100)}%
            </p>
            <p className="mt-2 text-sm font-bold text-violet-100">
              {correctCount} đúng · {questions.length - correctCount} sai
            </p>
          </div>

          {aiSummary && (
            <div className="clay-card rounded-2xl sm:rounded-3xl border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-[#6d28d9] uppercase">
                <Sparkles size={15} />
                <span>Nhận xét từ Gia sư Gemini ({geminiModel})</span>
              </div>
              <p className="text-sm leading-relaxed font-semibold text-slate-800">
                {aiSummary.overallFeedback}
              </p>
              {aiSummary.weakAreas.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600">Cần ôn kỹ:</span>
                  {aiSummary.weakAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-white/90 p-3 text-xs font-bold text-[#5b21b6]">
                <Lightbulb size={14} className="mt-0.5 shrink-0 text-[#7c3aed]" />
                <span>Mẹo học: {aiSummary.nextTip}</span>
              </p>
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={result.question.key}
              className={`clay-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 ${
                result.correct ? "border-emerald-200" : "border-red-200"
              }`}
            >
              <div className="flex gap-2.5 sm:gap-3">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-black text-white ${
                    result.correct ? "bg-emerald-600" : "bg-red-600"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-slate-900 break-words">
                    {result.question.prompt}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-600 break-words">
                    Bạn trả lời:{" "}
                    <b className={result.correct ? "text-emerald-700" : "text-red-600"}>
                      {result.answer || "(bỏ trống)"}
                    </b>
                  </p>
                  {!result.correct && (
                    <p className="mt-1 text-sm font-medium text-slate-600 break-words">
                      Đáp án đúng: <b className="text-emerald-700">{result.expected}</b>
                    </p>
                  )}
                  {(result.aiFeedback || result.question.explanation) && (
                    <p className="clay-surface mt-2.5 flex items-start gap-2 rounded-2xl p-3 text-xs font-semibold text-slate-700 break-words">
                      <Lightbulb size={14} className="mt-0.5 shrink-0 text-[#7c3aed]" />
                      <span className="min-w-0">{result.aiFeedback || result.question.explanation}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="grid gap-2.5 sm:grid-cols-3">
            <Button
              variant="outline"
              disabled={!wrongCards.length || generating}
              onClick={() => void createTest(wrongCards)}
              className="h-11 rounded-2xl border-[var(--border)] bg-white font-bold"
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
              className="h-11 rounded-2xl border-[var(--border)] bg-white font-bold"
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
              className="clay-cta h-11 rounded-2xl bg-[#047857] font-bold text-white hover:bg-[#065f46]"
            >
              {saved ? "Đã ghi vào FSRS" : saving ? "Đang ghi..." : "Ghi kết quả vào FSRS"}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmitTest(event)} className="space-y-3.5 sm:space-y-4">
          {questions.map((question, index) => (
            <div key={question.key} className="clay-card rounded-[24px] sm:rounded-[28px] p-4 sm:p-6">
              <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[#6d28d9]">
                {testUsedAi && <Sparkles size={13} />}
                CÂU {index + 1} ·{" "}
                {question.kind === "multiple-choice" ? "TRẮC NGHIỆM" : "GÕ ĐÁP ÁN"}
              </p>
              <h3 className="font-display my-3 sm:my-4 text-lg sm:text-xl font-bold text-slate-900 break-words">
                {question.prompt}
              </h3>
              {question.hint && (
                <p className="mb-3 sm:mb-4 text-xs font-bold text-[#6d28d9] break-words">
                  Gợi ý: {question.hint}
                </p>
              )}

              {question.kind === "multiple-choice" ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {question.choices.map((choice) => {
                    const checked = answers[question.key] === choice;
                    return (
                      <label
                        key={choice}
                        className={`flex min-h-11 sm:min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] p-3 sm:p-3.5 text-sm font-bold transition-all ${
                          checked
                            ? "border-[#7c3aed] bg-violet-50 text-[#5b21b6] shadow-xs"
                            : "border-[var(--border)] bg-[#fdfbff] text-slate-800 hover:border-violet-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.key}
                          checked={checked}
                          onChange={() =>
                            setAnswers((current) => ({ ...current, [question.key]: choice }))
                          }
                          className="shrink-0 accent-[#7c3aed]"
                        />
                        <span className="min-w-0 break-words">{choice}</span>
                      </label>
                    );
                  })}
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
                  className="h-11 rounded-2xl border-[var(--border)] bg-white"
                />
              )}
            </div>
          ))}
          <Button
            disabled={grading}
            className="clay-cta h-12 w-full rounded-2xl bg-[#7c3aed] text-base font-extrabold text-white hover:bg-[#6d28d9]"
          >
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
