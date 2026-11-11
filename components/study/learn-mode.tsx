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
          `⚠️ Gemini tạm gián đoạn (${reason}) — đã chấm đối chiếu cục bộ.`,
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
            className="h-10 rounded-xl border bg-white px-3 text-sm font-bold"
          >
            <option value="both">Hai chiều</option>
            <option value="en-vi">English → Vietnamese</option>
            <option value="vi-en">Vietnamese → English</option>
          </select>
        }
      />

      {cards.length > 0 && card && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/70 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Sparkles size={15} className={geminiActive && useAiMode ? "text-[#6366f1]" : "text-slate-400"} />
            {geminiActive ? (
              <span>
                Gia sư Gemini (<code>{geminiModel}</code>):{" "}
                <b className={useAiMode ? "text-[#6366f1]" : "text-slate-500"}>
                  {useAiMode ? "Đang bật chấm nghĩa thông minh" : "Đang tắt"}
                </b>
                {aiQuestionsCount > 0 && useAiMode ? ` · ${aiQuestionsCount} câu ngữ cảnh` : ""}
              </span>
            ) : (
              <span className="text-slate-500">
                Bật Gemini AI để chấm nghĩa linh hoạt &amp; tạo câu hỏi ngữ cảnh
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {geminiActive && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={useAiMode ? "default" : "outline"}
                  onClick={() => setAiModeOverride(!useAiMode)}
                  className={`h-8 rounded-xl text-xs font-bold ${
                    useAiMode ? "bg-[#6366f1] hover:bg-[#4f46e5]" : ""
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
                  className="h-8 gap-1 rounded-xl border-indigo-200 text-xs font-bold text-[#6366f1] hover:bg-indigo-50"
                >
                  {generatingAi ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  {generatingAi
                    ? "Đang tạo..."
                    : aiQuestionsCount > 0
                    ? "Tạo lại đề AI"
                    : "Tạo câu hỏi AI"}
                </Button>
              </>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOpenGeminiSettings}
              className="h-8 gap-1 rounded-xl px-2.5 text-xs font-bold text-slate-600"
            >
              <Settings2 size={13} />
              {geminiActive ? "Key" : "Cài API Key"}
            </Button>
          </div>
        </div>
      )}

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
              <span className="flex items-center gap-1.5 text-xs font-black tracking-[.15em] text-[#6c63ff] uppercase">
                {aiQuestion && <Sparkles size={13} />}
                {kind === "multiple-choice" ? "Trắc nghiệm" : "Gõ đáp án"} ·{" "}
                {direction === "en-vi" ? "EN → VI" : "VI → EN"}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Đúng {mastery[card.id] || 0}/2
              </span>
            </div>

            <h2 className="my-8 text-center text-2xl font-black sm:text-3xl">{promptText}</h2>
            {direction === "en-vi" && !aiQuestion && (
              <div className="-mt-5 mb-7">
                <WordMeta card={card} />
              </div>
            )}
            {aiQuestion?.hint && (
              <p className="-mt-4 mb-6 text-center text-xs font-semibold text-indigo-600">
                Gợi ý: {aiQuestion.hint}
              </p>
            )}

            {kind === "multiple-choice" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {choices.map((choice) => (
                  <button
                    key={choice}
                    disabled={Boolean(feedback)}
                    onClick={() => void answer(choice)}
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
                  className="h-12 text-base"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(feedback) || gradingAi}
                    onClick={() => void answer("")}
                  >
                    <HelpCircle />
                    Tôi không biết
                  </Button>
                  <Button disabled={Boolean(feedback) || gradingAi || !typed.trim()}>
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
