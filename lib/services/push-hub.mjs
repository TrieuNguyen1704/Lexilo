import { setVapidDetails, sendNotification } from "web-push";
import { createClient } from "@supabase/supabase-js";

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BJZGuP6Qe3Pd4uDYYBOH59qxZ3NACT3D-BclcEqTZ7bMckSup16mGwCRZvgBd-cmJB_TfX7j8JL4UfIv4j7KcEs";

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "UAE6Uis8oZnjCXeS53Vfh6vERWG7u3oK_evwDO0u-JQ";

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:support@lexilo.app";

export const SYSTEM_PUSH_HUB = {
  EMAIL: "system_push_hub@lexilo.internal",
  PASS: "LexiloPushSystemHub2026!",
};

export const DEFAULT_SUPABASE_CONFIG = {
  URL: "https://wbvxedcmkzzgpacnyvpx.supabase.co",
  ANON_KEY: "sb_publishable_k8qDG16TYsVCH7xnJhBZjw_OCxMLTUw",
};

let vapidConfigured = false;
export function ensureVapidConfigured() {
  if (vapidConfigured) return;
  try {
    setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } catch (err) {
    console.warn("Failed to set VAPID details:", err);
  }
}

let cachedHubClient = null;
let cachedHubUserId = null;
let memoryFallbackSubscriptions = [];

async function getHubClient() {
  if (cachedHubClient && cachedHubUserId) {
    return { client: cachedHubClient, userId: cachedHubUserId };
  }

  const client = createClient(DEFAULT_SUPABASE_CONFIG.URL, DEFAULT_SUPABASE_CONFIG.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email: SYSTEM_PUSH_HUB.EMAIL,
      password: SYSTEM_PUSH_HUB.PASS,
    });

    if (signInData?.user?.id) {
      cachedHubClient = client;
      cachedHubUserId = signInData.user.id;
      return { client, userId: signInData.user.id };
    }

    if (signInErr) {
      const { data: signUpData } = await client.auth.signUp({
        email: SYSTEM_PUSH_HUB.EMAIL,
        password: SYSTEM_PUSH_HUB.PASS,
      });
      if (signUpData?.user?.id) {
        cachedHubClient = client;
        cachedHubUserId = signUpData.user.id;
        return { client, userId: signUpData.user.id };
      }
    }
  } catch (err) {
    console.warn("Could not authenticate system push hub with Supabase:", err);
  }

  return { client: null, userId: null };
}

export async function getAllPushSubscriptions() {
  const { client, userId } = await getHubClient();
  if (!client || !userId) {
    return [...memoryFallbackSubscriptions];
  }

  try {
    const { data, error } = await client
      .from("user_sync_store")
      .select("store_data")
      .eq("user_id", userId)
      .single();

    if (!error && data?.store_data) {
      const parsed = data.store_data;
      if (Array.isArray(parsed.subscriptions)) {
        memoryFallbackSubscriptions = parsed.subscriptions;
        return parsed.subscriptions;
      }
    }
  } catch (err) {
    console.warn("Error fetching push subscriptions from Supabase hub:", err);
  }

  return [...memoryFallbackSubscriptions];
}

async function persistSubscriptions(list) {
  memoryFallbackSubscriptions = list;
  const { client, userId } = await getHubClient();
  if (!client || !userId) return false;

  try {
    const storePayload = {
      subscriptions: list,
      lastChecked: new Date().toISOString(),
    };

    const { error } = await client.from("user_sync_store").upsert({
      user_id: userId,
      store_data: storePayload,
      updated_at: new Date().toISOString(),
    });

    return !error;
  } catch (err) {
    console.warn("Error persisting push subscriptions to Supabase hub:", err);
    return false;
  }
}

export async function savePushSubscription(subData) {
  try {
    const all = await getAllPushSubscriptions();
    const index = all.findIndex((s) => s.endpoint === subData.endpoint);

    if (index >= 0) {
      all[index] = {
        ...all[index],
        ...subData,
        lastDailySentDate: subData.lastDailySentDate || all[index].lastDailySentDate,
        updatedAt: new Date().toISOString(),
      };
    } else {
      all.push({
        ...subData,
        updatedAt: new Date().toISOString(),
      });
    }

    await persistSubscriptions(all);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Không thể lưu thông tin đăng ký push.";
    return { success: false, error: msg };
  }
}

export async function removePushSubscription(endpoint) {
  try {
    const all = await getAllPushSubscriptions();
    const filtered = all.filter((s) => s.endpoint !== endpoint);
    if (filtered.length !== all.length) {
      await persistSubscriptions(filtered);
    }
  } catch (err) {
    console.warn("Error removing push subscription:", err);
  }
}

export async function sendPushToSubscription(sub, payload) {
  ensureVapidConfigured();

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag || "lexilo-study-reminder",
    timestamp: Date.now(),
  });

  try {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    };

    const response = await sendNotification(pushSubscription, pushPayload, {
      TTL: 86400,
      urgency: "high",
    });

    return { success: true, statusCode: response.statusCode };
  } catch (err) {
    const statusCode = err && typeof err === "object" ? err.statusCode : undefined;
    if (statusCode === 410 || statusCode === 404) {
      void removePushSubscription(sub.endpoint);
    }
    return {
      success: false,
      statusCode,
      error: (err && err.message) || "Lỗi gửi thông báo Web Push",
    };
  }
}

export async function dispatchScheduledReminders(forceNow = false) {
  const subscriptions = await getAllPushSubscriptions();
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, total: 0, cleaned: 0 };
  }

  let sentCount = 0;
  const expiredEndpoints = [];
  const updatedList = [...subscriptions];

  const now = Date.now();

  for (let i = 0; i < updatedList.length; i++) {
    const sub = updatedList[i];
    if (!sub.dailyEnabled) continue;

    const offsetMs = (sub.timezoneOffset ?? -420) * 60 * 1000;
    const userLocal = new Date(now - offsetMs);
    const todayStr = userLocal.toISOString().slice(0, 10);

    const [targetHour, targetMinute] = (sub.reminderTime || "20:00").split(":").map(Number);
    const currentHour = userLocal.getUTCHours();
    const currentMinute = userLocal.getUTCMinutes();

    const isExactOrAfterMinute =
      currentHour === targetHour &&
      currentMinute >= targetMinute - 5 &&
      currentMinute <= targetMinute + 45;

    const shouldSend = forceNow || (isExactOrAfterMinute && sub.lastDailySentDate !== todayStr);

    if (shouldSend) {
      const count = sub.dueCount || 0;
      const title = "Lexilo — Đã đến giờ ôn tập! 📚";
      const body =
        count > 0
          ? `Bạn có ${count} thẻ từ vựng cần ôn tập hôm nay. Dành 5 phút để hoàn thành nhé!`
          : "Đã đến giờ ôn tập mỗi ngày. Dành 5 phút củng cố từ vựng để giữ vững chuỗi nhé!";

      const result = await sendPushToSubscription(sub, {
        title,
        body,
        url: "/?mode=study",
        tag: `lexilo-reminder-${todayStr}`,
      });

      if (result.success) {
        sentCount++;
        sub.lastDailySentDate = todayStr;
      } else if (result.statusCode === 410 || result.statusCode === 404) {
        expiredEndpoints.push(sub.endpoint);
      }
    }
  }

  const cleanList = updatedList.filter((s) => !expiredEndpoints.includes(s.endpoint));
  if (sentCount > 0 || expiredEndpoints.length > 0) {
    await persistSubscriptions(cleanList);
  }

  return {
    sent: sentCount,
    total: subscriptions.length,
    cleaned: expiredEndpoints.length,
  };
}
