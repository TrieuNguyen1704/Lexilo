import { NextResponse } from "next/server";
import { dispatchScheduledReminders } from "@/lib/services/push-hub";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const result = await dispatchScheduledReminders(force);
  return NextResponse.json({ success: true, dispatched: result });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const result = await dispatchScheduledReminders(force);
  return NextResponse.json({ success: true, dispatched: result });
}
