import type { Direction, QuestionKind } from "./lexilo";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface AiLearnQuestion {
  cardId: string;
  kind: QuestionKind;
  direction: Direction;
  prompt: string;
  hint?: string;
  choices: string[];
  expected: string;
  explanation?: string;
}

export interface AiGradeResult {
  isCorrect: boolean;
  feedback: string;
  explanation?: string;
}

export interface AiTestQuestion {
  key: string;
  cardId: string;
  kind: QuestionKind;
  direction: Direction;
  prompt: string;
  hint?: string;
  choices: string[];
  expected: string;
  explanation?: string;
}

export interface AiTestSummary {
  overallFeedback: string;
  weakAreas: string[];
  nextTip: string;
}
