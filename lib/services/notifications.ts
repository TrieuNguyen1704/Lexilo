import { STORAGE_KEYS, VAPID_PUBLIC_KEY } from "@/lib/config/constants";
import type { Card } from "@/types/lexilo";
import type { NotificationStatus } from "@/types/navigation";

type BadgeCapableNavigator = {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function isPageForegroundActive(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.visibilityState === "visible" &&
    (typeof document.hasFocus === "function" ? document.hasFocus() : true)
  );
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export function isNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEYS.NOTIF_ENABLED) === "true";
}

export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.NOTIF_ENABLED, enabled ? "true" : "false");
}

export function isRealtimeNotifEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = window.localStorage.getItem(STORAGE_KEYS.NOTIF_REALTIME);
  return val === null ? true : val === "true";
}

export function setRealtimeNotifEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.NOTIF_REALTIME, enabled ? "true" : "false");
}

export function isDailyReminderEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = window.localStorage.getItem(STORAGE_KEYS.NOTIF_DAILY);
  return val === null ? true : val === "true";
}

export function setDailyReminderEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.NOTIF_DAILY, enabled ? "true" : "false");
}

export function getCustomReminderTime(): string {
  if (typeof window === "undefined") return "20:00";
  return window.localStorage.getItem(STORAGE_KEYS.NOTIF_CUSTOM_TIME) || "20:00";
}

export function setCustomReminderTime(timeStr: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.NOTIF_CUSTOM_TIME, timeStr);
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js");
    }

    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);

    return readyReg || reg;
  } catch (err) {
    console.warn("Could not get SW registration:", err);
    return null;
  }
}

export async function sendNotification(
  title: string,
  body: string,
  dataUrl = "/",
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  const options: NotificationOptions = {
    body,
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    tag: `lexilo-${Date.now()}`,
    data: { url: dataUrl },
  };

  try {
    const reg = await getServiceWorkerRegistration();
    if (reg && "showNotification" in reg) {
      await reg.showNotification(title, options);
      return true;
    }
  } catch (err) {
    console.warn("SW showNotification failed:", err);
  }

  try {
    if (typeof Notification === "function") {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    }
  } catch (err) {
    console.warn("Direct Notification failed:", err);
  }

  return false;
}

export async function syncPushSubscription(dueCount = 0): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (Notification.permission !== "granted" || !isNotificationsEnabled()) return false;

  try {
    const reg = await getServiceWorkerRegistration();
    if (!reg || !reg.pushManager) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    if (!sub) return false;

    window.localStorage.setItem(STORAGE_KEYS.PUSH_SUBSCRIPTION, JSON.stringify(sub.toJSON()));

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        reminderTime: getCustomReminderTime(),
        timezoneOffset: new Date().getTimezoneOffset(),
        dailyEnabled: isDailyReminderEnabled(),
        realtimeEnabled: isRealtimeNotifEnabled(),
        dueCount,
      }),
    });

    return response.ok;
  } catch (err) {
    console.warn("Could not sync Web Push subscription:", err);
    return false;
  }
}

export async function sendTestWebPush(
  delaySeconds = 3,
  dueCount = 0,
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { success: false, error: "Trình duyệt không hỗ trợ Service Worker" };
  }

  try {
    const reg = await getServiceWorkerRegistration();
    if (!reg?.pushManager) {
      return { success: false, error: "Không tìm thấy Push Manager" };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }
    if (!sub) {
      return { success: false, error: "Không thể tạo đăng ký Web Push trên thiết bị này" };
    }

    const response = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        delaySeconds,
        dueCount,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
    };
    if (!response.ok || !data.success) {
      return { success: false, error: data.error || "Lỗi gửi thông báo từ máy chủ" };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Không thể gửi yêu cầu push";
    return { success: false, error: msg };
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      void syncPushSubscription();
      await sendNotification(
        "Lexilo đã bật thông báo! 🧠",
        "Hệ thống sẽ nhắc bạn khi có từ vựng đến hạn ôn tập.",
      );
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return false;
  }
}

export function updateAppBadge(count: number): void {
  if (typeof window === "undefined") return;

  const badgeNav = navigator as unknown as BadgeCapableNavigator;
  if (count > 0 && typeof badgeNav.setAppBadge === "function") {
    badgeNav.setAppBadge(count).catch(() => {});
  } else if (count <= 0 && typeof badgeNav.clearAppBadge === "function") {
    badgeNav.clearAppBadge().catch(() => {});
  }
}

function getNotifiedCardIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.NOTIF_CARD_IDS);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setNotifiedCardIds(ids: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.NOTIF_CARD_IDS, JSON.stringify(ids));
  } catch {
    // Ignore storage quota issues
  }
}

export async function checkRealtimeDueNotification(cards: Card[]): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (
    !isNotificationsEnabled() ||
    !isRealtimeNotifEnabled() ||
    getNotificationPermission() !== "granted"
  ) {
    return false;
  }

  const now = Date.now();
  const currentDueCards = cards.filter((c) => c.due <= now);
  if (currentDueCards.length === 0) {
    setNotifiedCardIds([]);
    return false;
  }

  // If the user is actively viewing and interacting with the page, do NOT pop up a noisy system notification
  if (isPageForegroundActive()) {
    setNotifiedCardIds(currentDueCards.map((c) => c.id));
    return false;
  }

  const alreadyNotified = getNotifiedCardIds();
  const newlyDueCards = currentDueCards.filter((c) => !alreadyNotified.includes(c.id));

  if (newlyDueCards.length > 0) {
    const previewWord = newlyDueCards[0].front;
    const extraCount = newlyDueCards.length - 1;
    const bodyText =
      extraCount > 0
        ? `Từ "${previewWord}" và ${extraCount} thẻ khác đã đến hạn ôn tập FSRS.`
        : `Từ "${previewWord}" đã đến hạn ôn tập lại theo FSRS.`;

    const sent = await sendNotification(
      `🔔 ${newlyDueCards.length} thẻ vừa đến hạn ôn tập!`,
      bodyText,
    );

    if (sent) {
      setNotifiedCardIds(currentDueCards.map((c) => c.id));
      return true;
    }
  }

  return false;
}

export async function checkDailyReminderNotification(dueCount: number): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (
    !isNotificationsEnabled() ||
    !isDailyReminderEnabled() ||
    getNotificationPermission() !== "granted"
  ) {
    return false;
  }
  if (dueCount <= 0) return false;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const lastDaily = window.localStorage.getItem(STORAGE_KEYS.NOTIF_LAST_DAILY_DATE);
  if (lastDaily === todayStr) return false;

  // If the user is already on the page studying, mark today as satisfied without annoying popup
  if (isPageForegroundActive()) {
    window.localStorage.setItem(STORAGE_KEYS.NOTIF_LAST_DAILY_DATE, todayStr);
    return false;
  }

  const customTime = getCustomReminderTime();
  const [targetHour, targetMinute] = customTime.split(":").map(Number);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Only trigger when close to the target time (within 20 minutes) when tab is hidden/backgrounded
  const currentMinutesTotal = currentHour * 60 + currentMinute;
  const targetMinutesTotal = targetHour * 60 + targetMinute;
  const isTimeOrAfter =
    currentMinutesTotal >= targetMinutesTotal &&
    currentMinutesTotal <= targetMinutesTotal + 30;

  if (isTimeOrAfter) {
    const sent = await sendNotification(
      `Nhắc nhở học tập (${customTime}): ${dueCount} thẻ đang chờ! 📚`,
      "Đã đến giờ ôn tập bạn đã đặt. Hãy dành vài phút hoàn thành mục tiêu hôm nay nhé!",
    );

    if (sent) {
      window.localStorage.setItem(STORAGE_KEYS.NOTIF_LAST_DAILY_DATE, todayStr);
      return true;
    }
  }

  return false;
}

export async function checkAllNotifications(cards: Card[]): Promise<void> {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const dueCards = cards.filter((c) => c.due <= now);
  updateAppBadge(dueCards.length);

  await checkRealtimeDueNotification(cards);
  await checkDailyReminderNotification(dueCards.length);
  void syncPushSubscription(dueCards.length);
}
