import { NextResponse } from "next/server";
import {
  DEFAULT_GEMINI_MODEL,
  forwardGeminiGenerateContent,
} from "@/lib/services/gemini-proxy.mjs";

export async function GET() {
  const configured = Boolean(process.env.GEMINI_API_KEY?.trim());
  const defaultModel = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  return NextResponse.json({
    configured,
    defaultModel,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      prompt?: string;
      model?: string;
      temperature?: number;
      timeoutMs?: number;
      thinkingLevel?: "minimal" | "low" | "medium" | "high";
      apiKey?: string;
    };

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json({ error: "Thiếu nội dung prompt." }, { status: 400 });
    }

    const activeKey = body.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
    const activeModel =
      body.model?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

    const result = await forwardGeminiGenerateContent({
      apiKey: activeKey,
      model: activeModel,
      prompt,
      temperature: typeof body.temperature === "number" ? body.temperature : 0.4,
      timeoutMs: typeof body.timeoutMs === "number" ? body.timeoutMs : 20_000,
      thinkingLevel: body.thinkingLevel ?? "minimal",
    });

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Không thể kết nối Gemini API." },
      { status: err.status || 500 },
    );
  }
}
