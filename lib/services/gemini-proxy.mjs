const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

const TRANSIENT_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
];

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
  if (status === 503) {
    return `Mô hình Gemini (${model}) đang quá tải tạm thời. Vui lòng thử lại sau giây lát.`;
  }
  return apiMessage || `Lỗi kết nối Gemini API (HTTP ${status}).`;
}

async function callSingleGeminiModel({
  apiKey,
  model,
  prompt,
  temperature,
  timeoutMs,
  thinkingLevel,
}) {
  const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
  const generationConfig = {
    temperature,
    responseMimeType: "application/json",
    ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: String(prompt || "") }] }],
      generationConfig,
    }),
    signal: AbortSignal.timeout(Number(timeoutMs) || 20_000),
  });

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

/**
 * Forward a structured JSON generation prompt to Google Gemini REST API
 * with automatic compatibility handling for thinkingLevel and 503 fallback.
 */
export async function forwardGeminiGenerateContent({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  prompt,
  temperature = 0.4,
  timeoutMs = 20_000,
  thinkingLevel = "minimal",
}) {
  const cleanKey = String(apiKey || "").trim();
  const cleanModel = String(model || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;

  if (!cleanKey) {
    const err = new Error("Chưa cấu hình Gemini API Key.");
    err.status = 400;
    throw err;
  }

  const candidateModels = Array.from(
    new Set([cleanModel, ...TRANSIENT_FALLBACK_MODELS]),
  );

  let lastError = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const targetModel = candidateModels[i];
    const isPrimary = i === 0;

    try {
      let { response, payload } = await callSingleGeminiModel({
        apiKey: cleanKey,
        model: targetModel,
        prompt,
        temperature,
        timeoutMs,
        thinkingLevel,
      });

      // Some models (e.g. gemini-3.8-flash) reject "minimal" thinkingLevel; retry with "low" then omitted
      if (
        response.status === 400 &&
        thinkingLevel &&
        String(payload?.error?.message || "").toLowerCase().includes("thinking")
      ) {
        ({ response, payload } = await callSingleGeminiModel({
          apiKey: cleanKey,
          model: targetModel,
          prompt,
          temperature,
          timeoutMs,
          thinkingLevel: undefined,
        }));
      }

      if (!response.ok) {
        const message = formatGeminiHttpError(
          response.status,
          targetModel,
          payload?.error?.message,
        );
        const err = new Error(message);
        err.status = response.status;

        // Auth/API key errors shouldn't fall back to other models
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          throw err;
        }

        // 503 overload / 429 transient: try next fallback Flash model cleanly
        lastError = err;
        if (response.status === 503 || response.status === 429 || (isPrimary && response.status === 404)) {
          continue;
        }
        throw err;
      }

      const parts = payload?.candidates?.[0]?.content?.parts || [];
      const answerPart =
        parts.find((part) => !part?.thought && typeof part?.text === "string") ??
        parts.at(-1);

      if (!answerPart?.text) {
        const err = new Error("Gemini không trả về dữ liệu hợp lệ.");
        err.status = 502;
        lastError = err;
        continue;
      }

      return { text: answerPart.text, model: targetModel };
    } catch (error) {
      lastError = error;
      const errStatus = error?.status;
      if (errStatus === 400 || errStatus === 401 || errStatus === 403) {
        throw error;
      }
      // On timeout or network hiccup on primary model, allow fallback to next fast Flash model
    }
  }

  throw lastError || new Error("Không thể kết nối Gemini API.");
}
