import { Card } from "./lexilo";

export type NotificationStatus = "unsupported" | "default" | "granted" | "denied";

const STORAGE_NOTIF_ENABLED = "lexilo_notifications_enabled";
const STORAGE_REALTIME_ENABLED = "lexilo_notif_realtime_enabled";
const STORAGE_DAILY_ENABLED = "lexilo_notif_daily_enabled";
const STORAGE_CUSTOM_TIME = "lexilo_reminder_custom_time"; // e.g. "20:00"
const STORAGE_LAST_DAILY_DATE = "lexilo_last_daily_date"; // "YYYY-MM-DD"
const STORAGE_NOTIFIED_CARD_IDS = "lexilo_notified_card_ids"; // JSON array of string IDs

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export function isNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_NOTIF_ENABLED) === "true";
}

export function setNotificationsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_NOTIF_ENABLED, enabled ? "true" : "false");
}

// Flow 1: Real-time due notification
export function isRealtimeNotifEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = window.localStorage.getItem(STORAGE_REALTIME_ENABLED);
  return val === null ? true : val === "true";
}

export function setRealtimeNotifEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_REALTIME_ENABLED, enabled ? "true" : "false");
}

// Flow 2: Custom daily reminder
export function isDailyReminderEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = window.localStorage.getItem(STORAGE_DAILY_ENABLED);
  return val === null ? true : val === "true";
}

export function setDailyReminderEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_DAILY_ENABLED, enabled ? "true" : "false");
}

export function getCustomReminderTime(): string {
  if (typeof window === "undefined") return "20:00";
  return window.localStorage.getItem(STORAGE_CUSTOM_TIME) || "20:00";
}

export function setCustomReminderTime(timeStr: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_CUSTOM_TIME, timeStr);
}

// Request permission and send welcome notification
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      await sendNotification(
        "Lexilo đã bật thông báo! 🧠",
        "Bạn sẽ nhận được thông báo khi có từ vựng đến hạn ôn tập."
      );
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return false;
  }
}

// Send notification via Service Worker registration
export async function sendNotification(title: string, body: string, dataUrl = "/"): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && "showNotification" in registration) {
      await registration.showNotification(title, {
        body,
        icon: "/icon-192.svg",
        badge: "/icon-192.svg",
        tag: "lexilo-due-notification",
        data: { url: dataUrl },
      });
      return true;
    }
  } catch (err) {
    console.error("Failed to show notification via service worker:", err);
  }

  try {
    new Notification(title, {
      body,
      icon: "/icon-192.svg",
    });
    return true;
  } catch {
    return false;
  }
}

// Update app icon badge on iOS and Android
export function updateAppBadge(count: number) {
  if (typeof window === "undefined") return;

  if ("setAppBadge" in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(() => {});
    } else {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }
}

function getNotifiedCardIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_NOTIFIED_CARD_IDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setNotifiedCardIds(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_NOTIFIED_CARD_IDS, JSON.stringify(ids));
  } catch {}
}

// Flow 1 Check: Immediate / Realtime notification when new cards become due
export async function checkRealtimeDueNotification(cards: Card[]): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isNotificationsEnabled() || !isRealtimeNotifEnabled() || getNotificationPermission() !== "granted") {
    return false;
  }

  const now = Date.now();
  const currentDueCards = cards.filter((c) => c.due <= now);
  if (currentDueCards.length === 0) {
    // Reset notified IDs if no cards are due
    setNotifiedCardIds([]);
    return false;
  }

  const alreadyNotified = getNotifiedCardIds();
  const newlyDueCards = currentDueCards.filter((c) => !alreadyNotified.includes(c.id));

  if (newlyDueCards.length > 0) {
    const previewWord = newlyDueCards[0].front;
    const extraCount = newlyDueCards.length - 1;
    const bodyText = extraCount > 0
      ? `Từ "${previewWord}" và ${extraCount} thẻ khác đã đến hạn ôn tập FSRS.`
      : `Từ "${previewWord}" đã đến hạn ôn tập lại theo FSRS.`;

    const sent = await sendNotification(
      `🔔 ${newlyDueCards.length} thẻ vừa đến hạn ôn tập!`,
      bodyText
    );

    if (sent) {
      setNotifiedCardIds(currentDueCards.map((c) => c.id));
      return true;
    }
  }

  return false;
}

// Flow 2 Check: Daily reminder at user's custom chosen time
export async function checkDailyReminderNotification(dueCount: number): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isNotificationsEnabled() || !isDailyReminderEnabled() || getNotificationPermission() !== "granted") {
    return false;
  }
  if (dueCount <= 0) return false;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const lastDaily = window.localStorage.getItem(STORAGE_LAST_DAILY_DATE);

  if (lastDaily === todayStr) {
    return false;
  }

  const customTime = getCustomReminderTime(); // "HH:mm"
  const [targetHour, targetMinute] = customTime.split(":").map(Number);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const isTimeOrAfter =
    currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute);

  if (isTimeOrAfter) {
    const sent = await sendNotification(
      `Nhắc nhở học tập (${customTime}): ${dueCount} thẻ đang chờ! 📚`,
      "Đã đến giờ ôn tập bạn đã đặt. Hãy dành vài phút hoàn thành mục tiêu hôm nay nhé!"
    );

    if (sent) {
      window.localStorage.setItem(STORAGE_LAST_DAILY_DATE, todayStr);
      return true;
    }
  }

  return false;
}

// Unified check called on interval and state changes
export async function checkAllNotifications(cards: Card[]) {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const dueCards = cards.filter((c) => c.due <= now);
  updateAppBadge(dueCards.length);

  await checkRealtimeDueNotification(cards);
  await checkDailyReminderNotification(dueCards.length);
}
