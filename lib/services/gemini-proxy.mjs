const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

/**
 * Translate raw Gemini HTTP status codes into user-friendly Vietnamese errors.
 */
export function formatGeminiHttpError(status, model, apiMessage) {
  if (status === 400 && String(apiMessage || "").toLowerCase().includes("api key")) {
    return "Gemini API Key không hợp lệ. Hãy kiểm tra lại API Key.";
  }
  if (status === 401 || status === 403) {
    return "Gemini API Key bị từ chối hoặc chưa được cấp quyền truy cập Gemini API.";
  }
  if (status === 404) {
    return `Model "${model}" không khả dụng với API Key này. Hãy thử chọn model khác (như gemini-3.6-flash hoặc gemini-3.8-flash).`;
  }
  if (status === 429) {
    return "Đã vượt quá giới hạn lượt gọi (quota) Gemini API. Vui lòng thử lại sau ít phút.";
  }
  return apiMessage || `Lỗi kết nối Gemini API (HTTP ${status}).`;
}

/**
 * Forward a structured JSON generation prompt to Google Gemini REST API.
 */
export async function forwardGeminiGenerateContent({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  prompt,
  temperature = 0.4,
  timeoutMs = 25_000,
}) {
  const cleanKey = String(apiKey || "").trim();
  const cleanModel = String(model || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;

  if (!cleanKey) {
    const err = new Error("Chưa cấu hình Gemini API Key.");
    err.status = 400;
    throw err;
  }

  const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(cleanModel)}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": cleanKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: String(prompt || "") }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(Number(timeoutMs) || 25_000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(
      formatGeminiHttpError(response.status, cleanModel, payload?.error?.message),
    );
    err.status = response.status;
    throw err;
  }

  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const answerPart =
    parts.find((part) => !part?.thought && typeof part?.text === "string") ??
    parts.at(-1);

  if (!answerPart?.text) {
    const err = new Error("Gemini không trả về dữ liệu hợp lệ.");
    err.status = 502;
    throw err;
  }

  return { text: answerPart.text, model: cleanModel };
}
