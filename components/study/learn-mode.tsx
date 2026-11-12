"use client";

import { useMemo, useState } from "react";
import { Check, HelpCircle, Loader2, Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  answerFor,
  choicesFor,
  isLocalFlexibleMatch,
  normalizeAnswer,
  questionFor,
  resolveDirection,
} from "@/lib/domain/quiz";
import {
  generateLearnQuestionsWithAi,
  gradeAnswerWithAi,
} from "@/lib/services/gemini";
import type { AiLearnQuestion } from "@/types/ai";
import type { Card, DirectionChoice, Notice, QuestionKind } from "@/types/lexilo";
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
  geminiActive: boolean;
  geminiModel: string;
  onOpenGeminiSettings: () => void;
  onNotice: (kind: Notice["kind"], text: string) => void;
  onBack: () => void;
  onBatchReview: (results: ReviewResult[]) => Promise<void>;
}

interface LearnFeedbackState {
  correct: boolean;
  expected: string;
  aiNote?: string;
  aiExplanation?: string;
}

export function LearnMode({
  cards,
  title,
  geminiActive,
  geminiModel,
  onOpenGeminiSettings,
  onNotice,
  onBack,
  onBatchReview,
}: LearnModeProps) {
  const [directionChoice, setDirectionChoice] = useState<DirectionChoice>("both");
  const [queue, setQueue] = useState(() => cards.map((card) => card.id));
  const [mastery, setMastery] = useState<Record<string, number>>({});
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [typed, setTyped] = useState("");
  const [feedback, setFeedback] = useState<LearnFeedbackState | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [aiModeOverride, setAiModeOverride] = useState<boolean | null>(null);
  const useAiMode = geminiActive && (aiModeOverride ?? true);
  const [aiQuestions, setAiQuestions] = useState<Record<string, AiLearnQuestion>>({});
  const [generatingAi, setGeneratingAi] = useState(false);
  const [gradingAi, setGradingAi] = useState(false);

  const card = cards.find((candidate) => candidate.id === queue[0]);
  const aiQuestion = card && useAiMode ? aiQuestions[card.id] : undefined;

  const direction = aiQuestion?.direction ?? resolveDirection(directionChoice, attempts);
  const kind: QuestionKind =
    aiQuestion?.kind ?? (attempts % 2 === 0 ? "multiple-choice" : "typing");
  const promptText = card ? aiQuestion?.prompt || questionFor(card, direction) : "";
  const expectedText = card ? aiQuestion?.expected || answerFor(card, direction) : "";

  const choices = useMemo(() => {
    if (!card) return [];
    if (aiQuestion?.kind === "multiple-choice" && aiQuestion.choices.length >= 2) {
      return aiQuestion.choices;
    }
    return choicesFor(card, cards, direction);
  }, [aiQuestion, card, cards, direction]);

  const remaining = cards.filter((item) => (mastery[item.id] || 0) < 2).length;
  const aiQuestionsCount = Object.keys(aiQuestions).length;

  async function handleGenerateAiQuestions() {
    if (!geminiActive) {
      onOpenGeminiSettings();
      return;
    }
    setGeneratingAi(true);
    try {
      const generated = await generateLearnQuestionsWithAi(cards, directionChoice);
      setAiQuestions(generated);
      setAiModeOverride(true);
      onNotice(
        "success",
        `Gemini (${geminiModel}) đã tạo ${Object.keys(generated).length} câu hỏi ngữ cảnh!`,
      );
    } catch (error) {
      onNotice("error", (error as Error).message);
    } finally {
      setGeneratingAi(false);
    }
  }

  async function answer(value: string) {
    if (!card || feedback || gradingAi) return;

    const strictMatch = normalizeAnswer(value) === normalizeAnswer(expectedText);

    if (kind === "typing" && !strictMatch && value.trim() && geminiActive && useAiMode) {
      setTyped(value);
      setGradingAi(true);
      try {
        const graded = await gradeAnswerWithAi({
          card,
          direction,
          prompt: promptText,
          expectedAnswer: expectedText,
          userAnswer: value,
        });
        recordOutcome(
          graded.isCorrect,
          expectedText,
          graded.feedback,
          graded.explanation || aiQuestion?.explanation,
        );
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Lỗi kết nối Gemini";
        onNotice("error", `${reason} Đang tạm chấm theo đối chiếu cục bộ.`);
        const localPass = isLocalFlexibleMatch(value, expectedText);
        recordOutcome(
          localPass,
          expectedText,
          `Gemini tạm gián đoạn (${reason}) — đã chấm đối chiếu cục bộ.`,
          aiQuestion?.explanation,
        );
      } finally {
        setGradingAi(false);
      }
      return;
    }

    const passed = kind === "typing" ? isLocalFlexibleMatch(value, expectedText) : strictMatch;
    setTyped(value);
    recordOutcome(passed, expectedText, undefined, aiQuestion?.explanation);
  }

  function recordOutcome(
    correct: boolean,
    expected: string,
    aiNote?: string,
    aiExplanation?: string,
  ) {
    if (!card) return;
    setFeedback({ correct, expected, aiNote, aiExplanation });
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
            aria-label="Chiều câu hỏi"
            className="h-10 rounded-2xl border-[1.5px] border-[var(--border)] bg-white px-3.5 text-sm font-bold text-slate-800 shadow-[var(--clay-shadow-soft)]"
          >
            <option value="both">Hai chiều</option>
            <option value="en-vi">English → Vietnamese</option>
            <option value="vi-en">Vietnamese → English</option>
          </select>
        }
      />

      {cards.length > 0 && card && (
        <div className="clay-card mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-violet-200/80 bg-gradient-to-r from-violet-50/75 via-white to-indigo-50/60 px-3 py-2 sm:mb-4 sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-700 sm:gap-2">
            <Sparkles
              size={14}
              className={`shrink-0 ${geminiActive && useAiMode ? "text-[#7c3aed]" : "text-slate-400"}`}
            />
            {geminiActive ? (
              <span className="truncate">
                <span className="sm:hidden">
                  Gemini AI:{" "}
                  <b className={useAiMode ? "text-[#6d28d9]" : "text-slate-500"}>
                    {useAiMode ? "Đang bật" : "Đang tắt"}
                  </b>
                </span>
                <span className="hidden sm:inline">
                  Gia sư Gemini (<code>{geminiModel}</code>):{" "}
                  <b className={useAiMode ? "text-[#6d28d9]" : "text-slate-500"}>
                    {useAiMode ? "Đang bật chấm nghĩa thông minh" : "Đang tắt"}
                  </b>
                  {aiQuestionsCount > 0 && useAiMode ? ` · ${aiQuestionsCount} câu ngữ cảnh` : ""}
                </span>
              </span>
            ) : (
              <span className="truncate text-slate-600">Bật Gemini AI để chấm nghĩa thông minh</span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {geminiActive && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={useAiMode ? "default" : "outline"}
                  onClick={() => setAiModeOverride(!useAiMode)}
                  className={`h-7 rounded-xl px-2.5 text-[11px] font-extrabold sm:h-8 sm:px-3 sm:text-xs ${
                    useAiMode
                      ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                      : "border-[var(--border)] bg-white text-slate-700"
                  }`}
                >
                  {useAiMode ? "AI: BẬT" : "AI: TẮT"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={generatingAi}
                  onClick={() => void handleGenerateAiQuestions()}
                  className="h-7 gap-1 rounded-xl border-violet-200 bg-white px-2.5 text-[11px] font-extrabold text-[#6d28d9] hover:bg-violet-50 sm:h-8 sm:px-3 sm:text-xs"
                >
                  {generatingAi ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  <span className="sm:hidden">{generatingAi ? "Đang tạo..." : "Đề AI"}</span>
                  <span className="hidden sm:inline">
                    {generatingAi
                      ? "Đang tạo..."
                      : aiQuestionsCount > 0
                      ? "Tạo lại đề AI"
                      : "Tạo câu hỏi AI"}
                  </span>
                </Button>
              </>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOpenGeminiSettings}
              className="h-7 gap-1 rounded-xl px-2 text-[11px] font-bold text-slate-600 hover:bg-violet-50 sm:h-8 sm:px-2.5 sm:text-xs"
            >
              <Settings2 size={13} />
              <span className="hidden sm:inline">{geminiActive ? "Key" : "Cài API Key"}</span>
            </Button>
          </div>
        </div>
      )}

      {!cards.length ? (
        <StudyEmptyState title="Bộ thẻ đang trống" onBack={onBack} />
      ) : !card ? (
        <div className="clay-card rounded-[32px] p-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-[#047857]">
            <Check size={34} strokeWidth={2.75} />
          </span>
          <h2 className="font-display mt-4 text-2xl font-bold text-slate-900">Hoàn thành Learn</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Đúng {correctCount} · Sai {wrongCount}. Kết quả chưa thay đổi lịch FSRS.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button
              disabled={busy || saved}
              onClick={saveToFsrs}
              className="clay-cta h-11 rounded-2xl bg-[#047857] px-6 font-bold text-white hover:bg-[#065f46]"
            >
              {saved ? "Đã ghi vào FSRS" : busy ? "Đang ghi..." : "Ghi kết quả vào FSRS"}
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="h-11 rounded-2xl border-[var(--border)] bg-white px-6 font-bold"
            >
              Trở về bộ thẻ
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2.5 grid grid-cols-3 gap-2 sm:mb-4 sm:gap-3">
            <StudyStat label="Đúng" value={correctCount} color="#047857" />
            <StudyStat label="Sai" value={wrongCount} color="#dc2626" />
            <StudyStat label="Còn lại" value={remaining} color="#7c3aed" />
          </div>
          <Progress
            value={cards.length ? ((cards.length - remaining) / cards.length) * 100 : 0}
            className="h-2 rounded-full sm:h-2.5"
          />

          <div className="clay-card mt-3 rounded-3xl p-4 sm:mt-4 sm:rounded-[30px] sm:p-8">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[.12em] text-[#6d28d9] uppercase sm:text-xs sm:tracking-[.14em]">
                {aiQuestion && <Sparkles size={13} />}
                {kind === "multiple-choice" ? "Trắc nghiệm" : "Gõ đáp án"} ·{" "}
                {direction === "en-vi" ? "EN → VI" : "VI → EN"}
              </span>
              <span className="rounded-full bg-[#f7f3fd] px-2.5 py-0.5 text-[11px] font-extrabold text-slate-600 sm:px-3 sm:py-1 sm:text-xs">
                Đúng {mastery[card.id] || 0}/2
              </span>
            </div>

            <h2 className="font-display my-4 text-center text-xl font-bold break-words text-slate-900 sm:my-7 sm:text-3xl">
              {promptText}
            </h2>
            {direction === "en-vi" && !aiQuestion && (
              <div className="-mt-2 mb-4 sm:-mt-4 sm:mb-6">
                <WordMeta card={card} />
              </div>
            )}
            {aiQuestion?.hint && (
              <p className="-mt-2 mb-4 text-center text-xs font-bold text-[#6d28d9] sm:-mt-3 sm:mb-6">
                Gợi ý: {aiQuestion.hint}
              </p>
            )}

            {kind === "multiple-choice" ? (
              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                {choices.map((choice) => (
                  <button
                    key={choice}
                    disabled={Boolean(feedback)}
                    onClick={() => void answer(choice)}
                    className={`tap-press min-h-11 rounded-2xl border-[1.5px] p-3 text-left text-sm font-bold break-words transition-all sm:min-h-14 sm:p-4 sm:text-base ${
                      feedback && normalizeAnswer(choice) === normalizeAnswer(feedback.expected)
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-xs"
                        : "border-[var(--border)] bg-[#fdfbff] text-slate-800 shadow-[var(--clay-shadow-soft)] hover:border-[#7c3aed] hover:bg-violet-50/50"
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
                  void answer(typed);
                }}
                className="grid gap-3"
              >
                <Input
                  autoFocus
                  disabled={Boolean(feedback) || gradingAi}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  placeholder="Nhập câu trả lời..."
                  className="h-12 rounded-2xl border-[var(--border)] bg-white text-base"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(feedback) || gradingAi}
                    onClick={() => void answer("")}
                    className="h-11 rounded-2xl border-[var(--border)] bg-white font-bold text-slate-700"
                  >
                    <HelpCircle size={16} />
                    Tôi không biết
                  </Button>
                  <Button
                    disabled={Boolean(feedback) || gradingAi || !typed.trim()}
                    className="clay-cta h-11 rounded-2xl bg-[#7c3aed] font-bold text-white hover:bg-[#6d28d9]"
                  >
                    {gradingAi ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Gemini đang chấm...
                      </>
                    ) : (
                      "Kiểm tra"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {feedback && (
              <StudyFeedback
                correct={feedback.correct}
                expected={feedback.expected}
                aiNote={feedback.aiNote}
                aiExplanation={feedback.aiExplanation}
                onContinue={continueLearning}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
