export const DEFAULT_GEMINI_MODEL: string;

export function formatGeminiHttpError(
  status: number,
  model: string,
  apiMessage?: string,
): string;

export function forwardGeminiGenerateContent(params: {
  apiKey: string;
  model?: string;
  prompt: string;
  temperature?: number;
  timeoutMs?: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
}): Promise<{ text: string; model: string }>;
