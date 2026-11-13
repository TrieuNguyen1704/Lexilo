export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  reminderTime: string;
  timezoneOffset: number;
  dailyEnabled: boolean;
  realtimeEnabled: boolean;
  dueCount?: number;
  lastDailySentDate?: string;
  updatedAt?: string;
}

export {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  SYSTEM_PUSH_HUB,
  DEFAULT_SUPABASE_CONFIG,
  ensureVapidConfigured,
  getAllPushSubscriptions,
  savePushSubscription,
  removePushSubscription,
  sendPushToSubscription,
  dispatchScheduledReminders,
} from "./push-hub.mjs";
