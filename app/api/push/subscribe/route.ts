import { NextResponse } from "next/server";
import { savePushSubscription, type PushSubscriptionData } from "@/lib/services/push-hub";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      subscription?: {
        endpoint?: string;
        keys?: {
          p256dh?: string;
          auth?: string;
        };
      };
      reminderTime?: string;
      timezoneOffset?: number;
      dailyEnabled?: boolean;
      realtimeEnabled?: boolean;
      dueCount?: number;
    };

    const endpoint = body.subscription?.endpoint?.trim();
    const p256dh = body.subscription?.keys?.p256dh?.trim();
    const auth = body.subscription?.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Thông tin subscription Web Push không hợp lệ hoặc bị thiếu." },
        { status: 400 },
      );
    }

    const subData: PushSubscriptionData = {
      endpoint,
      keys: { p256dh, auth },
      reminderTime: typeof body.reminderTime === "string" ? body.reminderTime : "20:00",
      timezoneOffset: typeof body.timezoneOffset === "number" ? body.timezoneOffset : -420,
      dailyEnabled: body.dailyEnabled ?? true,
      realtimeEnabled: body.realtimeEnabled ?? true,
      dueCount: typeof body.dueCount === "number" ? body.dueCount : 0,
      updatedAt: new Date().toISOString(),
    };

    const result = await savePushSubscription(subData);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Lỗi lưu đăng ký push." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Đã đăng ký Web Push thành công." });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Không thể xử lý yêu cầu đăng ký push." },
      { status: 500 },
    );
  }
}
