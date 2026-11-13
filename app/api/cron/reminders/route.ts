import { NextResponse } from "next/server";
import { dispatchScheduledReminders } from "@/lib/services/push-hub";

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  try {
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    const result = await dispatchScheduledReminders(force);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dispatched: result,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Lỗi xử lý cron gửi thông báo nhắc nhở." },
      { status: 500 },
    );
  }
}
