export type NotificationStatus = "unsupported" | "default" | "granted" | "denied";

const STORAGE_NOTIF_ENABLED = "lexilo_notifications_enabled";
const STORAGE_REMINDER_TIME = "lexilo_reminder_time"; // e.g. "09:00" or "20:00"
const STORAGE_LAST_NOTIFIED = "lexilo_last_notified_date"; // "YYYY-MM-DD"

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

export function getReminderTime(): string {
  if (typeof window === "undefined") return "09:00";
  return window.localStorage.getItem(STORAGE_REMINDER_TIME) || "09:00";
}

export function setReminderTime(timeStr: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_REMINDER_TIME, timeStr);
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
        "Bạn sẽ nhận được nhắc nhở khi có từ vựng đến hạn ôn tập."
      );
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return false;
  }
}

// Send notification via Service Worker registration (Required for iOS Safari PWA)
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

  // Fallback to standard Notification API if available
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

// Check due cards and trigger reminder
export async function checkAndTriggerDueNotification(dueCount: number) {
  if (typeof window === "undefined") return;

  // Always update badge count on icon
  updateAppBadge(dueCount);

  if (dueCount <= 0) return;
  if (!isNotificationsEnabled() || getNotificationPermission() !== "granted") return;

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastNotified = window.localStorage.getItem(STORAGE_LAST_NOTIFIED);

  if (lastNotified === todayStr) {
    // Already notified today
    return;
  }

  const sent = await sendNotification(
    `Bạn có ${dueCount} từ vựng cần ôn tập! 📚`,
    "Dành 3-5 phút để duy trì lịch nhớ ngắt quãng FSRS nhé."
  );

  if (sent) {
    window.localStorage.setItem(STORAGE_LAST_NOTIFIED, todayStr);
  }
}
