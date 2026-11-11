import { STORAGE_KEYS } from "@/lib/config/constants";
import type { Card } from "@/types/lexilo";
import type { NotificationStatus } from "@/types/navigation";

type BadgeCapableNavigator = {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

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

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
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

  const customTime = getCustomReminderTime();
  const [targetHour, targetMinute] = customTime.split(":").map(Number);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const isTimeOrAfter =
    currentHour > targetHour ||
    (currentHour === targetHour && currentMinute >= targetMinute);

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
}
