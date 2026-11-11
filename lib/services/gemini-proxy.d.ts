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
}): Promise<{ text: string; model: string }>;
