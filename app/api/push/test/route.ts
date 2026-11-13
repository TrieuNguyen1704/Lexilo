import { NextResponse } from "next/server";
import { sendPushToSubscription, type PushSubscriptionData } from "@/lib/services/push-hub";

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
      delaySeconds?: number;
      dueCount?: number;
    };

    const endpoint = body.subscription?.endpoint?.trim();
    const p256dh = body.subscription?.keys?.p256dh?.trim();
    const auth = body.subscription?.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Thông tin subscription Web Push không hợp lệ." },
        { status: 400 },
      );
    }

    const sub: PushSubscriptionData = {
      endpoint,
      keys: { p256dh, auth },
      reminderTime: "20:00",
      timezoneOffset: -420,
      dailyEnabled: true,
      realtimeEnabled: true,
      dueCount: body.dueCount || 0,
      updatedAt: new Date().toISOString(),
    };

    const delay = Math.min(10, Math.max(0, Number(body.delaySeconds) || 0));
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    }

    const result = await sendPushToSubscription(sub, {
      title: "Lexilo — Kiểm tra thông báo nền 🔔",
      body: `Hệ thống Web Push hoạt động hoàn hảo! Bạn có ${sub.dueCount || 0} thẻ cần ôn tập.`,
      url: "/",
      tag: "lexilo-test-push",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Không thể gửi thông báo Web Push thử nghiệm." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã gửi thông báo Web Push thành công!",
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || "Không thể gửi thông báo thử." },
      { status: 500 },
    );
  }
}
