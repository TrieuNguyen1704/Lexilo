import { DEFAULT_GEMINI_MODEL, STORAGE_KEYS } from "@/lib/config/constants";
import { normalizePartOfSpeech } from "@/lib/domain/cards";
import { answerFor, choicesFor, questionFor, resolveDirection, shuffle } from "@/lib/domain/quiz";
import type {
  AiGradeResult,
  AiLearnQuestion,
  AiTestQuestion,
  AiTestSummary,
  GeminiConfig,
} from "@/types/ai";
import type { Card, CardDraft, Direction, DirectionChoice, QuestionKind } from "@/types/lexilo";
import { forwardGeminiGenerateContent } from "./gemini-proxy.mjs";

export interface ServerGeminiStatus {
  checked: boolean;
  configured: boolean;
  defaultModel: string;
}

let serverStatus: ServerGeminiStatus = {
  checked: false,
  configured: false,
  defaultModel: DEFAULT_GEMINI_MODEL,
};

export function getServerGeminiStatus(): ServerGeminiStatus {
  return serverStatus;
}

export async function fetchServerGeminiStatus(): Promise<ServerGeminiStatus> {
  if (typeof window === "undefined") return serverStatus;
  try {
    const response = await fetch("/api/gemini", { cache: "no-store" });
    if (!response.ok) {
      serverStatus = { ...serverStatus, checked: true, configured: false };
      return serverStatus;
    }
    const payload = (await response.json()) as {
      configured?: boolean;
      defaultModel?: string;
    };
    serverStatus = {
      checked: true,
      configured: Boolean(payload.configured),
      defaultModel: payload.defaultModel || DEFAULT_GEMINI_MODEL,
    };
  } catch {
    serverStatus = { ...serverStatus, checked: true, configured: false };
  }
  return serverStatus;
}

export function getGeminiConfig(): GeminiConfig {
  if (typeof window === "undefined") {
    return { apiKey: "", model: DEFAULT_GEMINI_MODEL, enabled: false };
  }
  const apiKey = window.localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || "";
  const model =
    window.localStorage.getItem(STORAGE_KEYS.GEMINI_MODEL) ||
    serverStatus.defaultModel ||
    DEFAULT_GEMINI_MODEL;
  const enabledRaw = window.localStorage.getItem(STORAGE_KEYS.GEMINI_ENABLED);
  const hasAnyKey = Boolean(apiKey.trim()) || serverStatus.configured;
  const enabled = enabledRaw === null ? hasAnyKey : enabledRaw === "true";

  return {
    apiKey: apiKey.trim(),
    model: model.trim() || DEFAULT_GEMINI_MODEL,
    enabled: hasAnyKey && enabled,
  };
}

export function saveGeminiConfig(config: GeminiConfig): void {
  if (typeof window === "undefined") return;
  const cleanedKey = config.apiKey.trim();
  const cleanedModel = config.model.trim() || DEFAULT_GEMINI_MODEL;

  if (cleanedKey) {
    window.localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, cleanedKey);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
  }

  window.localStorage.setItem(STORAGE_KEYS.GEMINI_MODEL, cleanedModel);
  window.localStorage.setItem(STORAGE_KEYS.GEMINI_ENABLED, config.enabled ? "true" : "false");
}

export function hasActiveGeminiConfig(): boolean {
  const cfg = getGeminiConfig();
  return Boolean((cfg.apiKey || serverStatus.configured) && cfg.enabled);
}

export function extractJsonFromGeminiText<T>(rawText: string): T {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

async function callServerGeminiProxy({
  prompt,
  model,
  temperature,
  timeoutMs,
}: {
  prompt: string;
  model: string;
  temperature: number;
  timeoutMs: number;
}): Promise<string> {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model, temperature, timeoutMs }),
    signal: AbortSignal.timeout(timeoutMs + 2000),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `Lỗi kết nối máy chủ Gemini (HTTP ${response.status}).`);
  }
  if (!payload.text) {
    throw new Error("Gemini không trả về dữ liệu hợp lệ.");
  }
  return payload.text;
}

export async function callGeminiJson<T>({
  prompt,
  apiKeyOverride,
  modelOverride,
  temperature = 0.4,
  timeoutMs = 25_000,
}: {
  prompt: string;
  apiKeyOverride?: string;
  modelOverride?: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<T> {
  const stored = getGeminiConfig();
  const explicitKey = (apiKeyOverride ?? stored.apiKey).trim();
  const model = (modelOverride ?? stored.model).trim() || DEFAULT_GEMINI_MODEL;

  let rawText: string;

  if (explicitKey) {
    const res = await forwardGeminiGenerateContent({
      apiKey: explicitKey,
      model,
      prompt,
      temperature,
      timeoutMs,
    });
    rawText = res.text;
  } else if (serverStatus.configured) {
    rawText = await callServerGeminiProxy({ prompt, model, temperature, timeoutMs });
  } else {
    throw new Error("Chưa cấu hình Gemini API Key.");
  }

  try {
    return extractJsonFromGeminiText<T>(rawText);
  } catch {
    throw new Error("Dữ liệu JSON từ Gemini không đúng định dạng.");
  }
}

export async function testGeminiConnection(
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await callGeminiJson<{ ok?: boolean; status?: string }>({
      prompt: 'Reply strictly with JSON: {"ok": true, "status": "ready"}',
      apiKeyOverride: apiKey,
      modelOverride: model,
      temperature: 0,
      timeoutMs: 12_000,
    });
    if (res.ok || res.status === "ready") {
      return { ok: true, message: `Kết nối thành công tới ${model}!` };
    }
    return { ok: true, message: `Đã phản hồi từ ${model}.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Không thể kết nối Gemini API.",
    };
  }
}

interface RawAiQuestionItem {
  cardId?: string;
  kind?: string;
  direction?: string;
  prompt?: string;
  hint?: string;
  choices?: string[];
  expected?: string;
  explanation?: string;
}

export async function generateLearnQuestionsWithAi(
  cards: Card[],
  directionChoice: DirectionChoice,
): Promise<Record<string, AiLearnQuestion>> {
  const sampleCards = cards.slice(0, 18);
  const compactCards = sampleCards.map((c, idx) => ({
    cardId: c.id,
    front: c.front,
    ipa: c.ipa,
    partOfSpeech: c.partOfSpeech,
    back: c.back,
    example: c.example,
    preferredDirection: resolveDirection(directionChoice, idx),
  }));

  const prompt = `You are an encouraging English tutor for Vietnamese learners.
Create smart quiz questions for each flashcard below. Return a JSON array of objects, one per cardId.
Schema for each object:
{
  "cardId": "matching id",
  "kind": "multiple-choice" or "typing",
  "direction": "en-vi" or "vi-en",
  "prompt": "Natural question text. For en-vi multiple-choice, ask Vietnamese meaning or give a short English sentence with the target word highlighted. For vi-en typing, give the Vietnamese meaning (or an English sentence with _____ replacing the target word) so user types the exact English word.",
  "hint": "Optional concise Vietnamese hint (max 10 words, never reveal answer)",
  "choices": ["4 plausible options when multiple-choice, MUST include exact expected answer, else []"],
  "expected": "Primary correct answer matching card.back (for en-vi) or card.front (for vi-en)",
  "explanation": "Concise 1-sentence Vietnamese explanation + usage tip"
}
Cards JSON:
${JSON.stringify(compactCards)}`;

  const items = await callGeminiJson<RawAiQuestionItem[]>({
    prompt,
    temperature: 0.45,
    timeoutMs: 25_000,
  });

  const map: Record<string, AiLearnQuestion> = {};
  if (!Array.isArray(items)) return map;

  const cardById = new Map(sampleCards.map((c) => [c.id, c]));
  for (const item of items) {
    if (!item?.cardId) continue;
    const card = cardById.get(item.cardId);
    if (!card) continue;

    const direction: Direction =
      item.direction === "vi-en" || item.direction === "en-vi"
        ? item.direction
        : resolveDirection(directionChoice, 0);
    const kind: QuestionKind =
      item.kind === "typing" || item.kind === "multiple-choice"
        ? item.kind
        : "multiple-choice";
    const expected = (item.expected || answerFor(card, direction)).trim();
    const rawChoices = Array.isArray(item.choices)
      ? item.choices.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const finalChoices =
      kind === "multiple-choice"
        ? rawChoices.includes(expected) && rawChoices.length >= 2
          ? shuffle(Array.from(new Set(rawChoices))).slice(0, 4)
          : choicesFor(card, cards, direction)
        : [];

    map[card.id] = {
      cardId: card.id,
      kind,
      direction,
      prompt: item.prompt?.trim() || questionFor(card, direction),
      hint: item.hint?.trim() || undefined,
      choices: finalChoices,
      expected,
      explanation: item.explanation?.trim() || undefined,
    };
  }

  return map;
}

export async function gradeAnswerWithAi({
  card,
  direction,
  prompt,
  expectedAnswer,
  userAnswer,
}: {
  card: Card;
  direction: Direction;
  prompt: string;
  expectedAnswer: string;
  userAnswer: string;
}): Promise<AiGradeResult> {
  if (!userAnswer.trim()) {
    return {
      isCorrect: false,
      feedback: `Đáp án là "${expectedAnswer}".`,
      explanation: card.example ? `Ví dụ: ${card.example}` : undefined,
    };
  }

  const aiPrompt = `You are an English vocabulary tutor for a Vietnamese learner.
Grade the learner's typed answer semantically (accept valid synonyms, concise Vietnamese meanings covering the main sense, or minor non-critical punctuation/article variations).
Card front: ${card.front}
Card back: ${card.back}
Direction: ${direction}
Question prompt: ${prompt}
Expected answer: ${expectedAnswer}
Learner answer: ${userAnswer}

Return ONLY JSON matching:
{
  "isCorrect": boolean,
  "feedback": "1 short encouraging Vietnamese sentence explaining why it is right or wrong",
  "explanation": "Optional brief memory tip or example in Vietnamese (1 sentence)"
}`;

  const result = await callGeminiJson<Partial<AiGradeResult>>({
    prompt: aiPrompt,
    temperature: 0.2,
    timeoutMs: 12_000,
  });

  return {
    isCorrect: Boolean(result.isCorrect),
    feedback:
      result.feedback?.trim() ||
      (result.isCorrect ? "Chính xác về mặt ý nghĩa!" : "Chưa đúng hoàn toàn."),
    explanation: result.explanation?.trim() || undefined,
  };
}

export async function generateTestWithAi({
  cards,
  count,
  kindChoice,
  directionChoice,
}: {
  cards: Card[];
  count: number;
  kindChoice: QuestionKind | "mixed";
  directionChoice: DirectionChoice;
}): Promise<AiTestQuestion[]> {
  const chosen = shuffle(cards).slice(0, Math.min(count, cards.length));
  const specs = chosen.map((card, index) => ({
    cardId: card.id,
    front: card.front,
    ipa: card.ipa,
    partOfSpeech: card.partOfSpeech,
    back: card.back,
    example: card.example,
    kind:
      kindChoice === "mixed"
        ? index % 2 === 0
          ? "multiple-choice"
          : "typing"
        : kindChoice,
    direction: resolveDirection(directionChoice, index),
  }));

  const prompt = `Create a cohesive English-Vietnamese vocabulary quiz for each item in this list.
Return a JSON array with the exact same length and cardId order.
Schema per item:
{
  "cardId": "matching cardId",
  "kind": "multiple-choice" | "typing",
  "direction": "en-vi" | "vi-en",
  "prompt": "Engaging question. For typing vi-en, you may write a natural fill-in-the-blank sentence using _____ + Vietnamese hint, or ask for the English word matching the Vietnamese meaning.",
  "hint": "Short optional hint (empty string if not needed)",
  "choices": ["4 plausible distinct choices including the exact expected answer if multiple-choice, else []"],
  "expected": "Expected answer string",
  "explanation": "1 concise Vietnamese sentence explaining the correct answer and nuance"
}
Items:
${JSON.stringify(specs)}`;

  const generated = await callGeminiJson<RawAiQuestionItem[]>({
    prompt,
    temperature: 0.4,
    timeoutMs: 25_000,
  });

  const generatedById = new Map(
    (Array.isArray(generated) ? generated : []).map((g) => [g.cardId, g]),
  );

  return specs.map((spec) => {
    const card = chosen.find((c) => c.id === spec.cardId)!;
    const item = generatedById.get(spec.cardId);
    const kind = spec.kind as QuestionKind;
    const direction = spec.direction as Direction;
    const expected = (item?.expected || answerFor(card, direction)).trim();
    const rawChoices = Array.isArray(item?.choices)
      ? item.choices.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const choices =
      kind === "multiple-choice"
        ? rawChoices.includes(expected) && rawChoices.length >= 2
          ? shuffle(Array.from(new Set(rawChoices))).slice(0, 4)
          : choicesFor(card, cards, direction)
        : [];

    return {
      key: crypto.randomUUID(),
      cardId: card.id,
      kind,
      direction,
      prompt: item?.prompt?.trim() || questionFor(card, direction),
      hint: item?.hint?.trim() || undefined,
      choices,
      expected,
      explanation: item?.explanation?.trim() || undefined,
    };
  });
}

interface BatchTestItemInput {
  key: string;
  word: string;
  meaning: string;
  prompt: string;
  expected: string;
  userAnswer: string;
  kind: QuestionKind;
  alreadyExact: boolean;
}

interface RawBatchGradeResponse {
  grades?: {
    key?: string;
    isCorrect?: boolean;
    feedback?: string;
  }[];
  summary?: {
    overallFeedback?: string;
    weakAreas?: string[];
    nextTip?: string;
  };
}

export async function gradeAndSummarizeTestWithAi(
  items: BatchTestItemInput[],
): Promise<{
  gradesByKey: Record<string, { isCorrect: boolean; feedback?: string }>;
  summary: AiTestSummary;
}> {
  const prompt = `You are a helpful English tutor reviewing a Vietnamese learner's quiz submission.
1. For each typing item where userAnswer is non-empty and alreadyExact is false, grade whether userAnswer is semantically correct (accept valid synonyms or core Vietnamese meaning, reject blank/wrong words).
2. Provide a short encouraging Vietnamese diagnostic summary based on all questions.

Submission:
${JSON.stringify(items)}

Return ONLY JSON matching:
{
  "grades": [
    { "key": "question key", "isCorrect": boolean, "feedback": "short 1-sentence Vietnamese comment" }
  ],
  "summary": {
    "overallFeedback": "2-sentence encouraging Vietnamese evaluation",
    "weakAreas": ["up to 3 short bullet strings of words/patterns to review, or empty array if 100%"],
    "nextTip": "1 practical study tip in Vietnamese"
  }
}`;

  const response = await callGeminiJson<RawBatchGradeResponse>({
    prompt,
    temperature: 0.25,
    timeoutMs: 20_000,
  });

  const gradesByKey: Record<string, { isCorrect: boolean; feedback?: string }> = {};
  if (Array.isArray(response.grades)) {
    for (const g of response.grades) {
      if (g.key) {
        gradesByKey[g.key] = {
          isCorrect: Boolean(g.isCorrect),
          feedback: g.feedback?.trim() || undefined,
        };
      }
    }
  }

  return {
    gradesByKey,
    summary: {
      overallFeedback:
        response.summary?.overallFeedback?.trim() ||
        "Bạn đã hoàn thành bài kiểm tra! Hãy xem lại các câu sai bên dưới nhé.",
      weakAreas: Array.isArray(response.summary?.weakAreas)
        ? response.summary.weakAreas.map((w) => String(w).trim()).filter(Boolean)
        : [],
      nextTip:
        response.summary?.nextTip?.trim() ||
        "Đọc to các ví dụ trong ngữ cảnh để nhớ từ lâu hơn.",
    },
  };
}

export async function generateFlashcardsWithGemini(inputText: string): Promise<CardDraft[]> {
  const clipped = inputText.trim().slice(0, 12_000);
  if (!clipped) {
    throw new Error("Anh chưa nhập nội dung.");
  }

  const prompt = `Create 5 to 20 high-value English vocabulary flashcards for a Vietnamese A2-C1 learner from the input below (reading passage, notes, or topic).
Return ONLY a JSON array matching this exact schema:
[
  {
    "front": "useful English word or phrase",
    "ipa": "standard IPA enclosed in / /, or empty string",
    "partOfSpeech": "lowercase English part of speech (noun, verb, adjective, adverb, phrasal verb, idiom, phrase), or empty string",
    "back": "concise Vietnamese meaning",
    "example": "natural English example sentence"
  }
]
Input:
${clipped}`;

  const rawCards = await callGeminiJson<Partial<CardDraft>[]>({
    prompt,
    temperature: 0.35,
    timeoutMs: 25_000,
  });

  if (!Array.isArray(rawCards)) {
    throw new Error("Gemini trả về danh sách thẻ chưa đúng định dạng.");
  }

  const normalized = rawCards
    .map((card) => ({
      front: typeof card.front === "string" ? card.front.trim() : "",
      ipa: typeof card.ipa === "string" ? card.ipa.trim() : "",
      partOfSpeech: normalizePartOfSpeech(card.partOfSpeech),
      back: typeof card.back === "string" ? card.back.trim() : "",
      example: typeof card.example === "string" ? card.example.trim() : "",
    }))
    .filter((card) => card.front && card.back)
    .slice(0, 30);

  if (!normalized.length) {
    throw new Error("Gemini không tạo được thẻ hợp lệ từ nội dung này.");
  }

  return normalized;
}
