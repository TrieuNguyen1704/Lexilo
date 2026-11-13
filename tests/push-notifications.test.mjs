import test from "node:test";
import assert from "node:assert/strict";
import {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  savePushSubscription,
  getAllPushSubscriptions,
  removePushSubscription,
  dispatchScheduledReminders,
} from "../lib/services/push-hub.mjs";

test("VAPID credentials are valid and present", () => {
  assert.ok(VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY.length > 30, "Public key should be present");
  assert.ok(VAPID_PRIVATE_KEY && VAPID_PRIVATE_KEY.length > 20, "Private key should be present");
  assert.ok(VAPID_SUBJECT.startsWith("mailto:"), "Subject should be mailto");
});

test("saves and retrieves push subscription without throwing", async () => {
  const dummyEndpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint-" + Date.now();
  const subData = {
    endpoint: dummyEndpoint,
    keys: {
      p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcDnVwT35_0w6lD7i2-test",
      auth: "51EP12n-qQ",
    },
    reminderTime: "20:00",
    timezoneOffset: -420,
    dailyEnabled: true,
    realtimeEnabled: true,
    dueCount: 4,
    updatedAt: new Date().toISOString(),
  };

  const saveRes = await savePushSubscription(subData);
  assert.strictEqual(saveRes.success, true);

  const all = await getAllPushSubscriptions();
  const found = all.find((s) => s.endpoint === dummyEndpoint);
  assert.ok(found, "Saved subscription should exist in push hub");
  assert.strictEqual(found.reminderTime, "20:00");
  assert.strictEqual(found.dueCount, 4);

  // Clean up
  await removePushSubscription(dummyEndpoint);
  const afterRemove = await getAllPushSubscriptions();
  assert.strictEqual(
    afterRemove.some((s) => s.endpoint === dummyEndpoint),
    false,
    "Subscription should be cleaned up",
  );
});

test("dispatchScheduledReminders returns valid result counts", async () => {
  const result = await dispatchScheduledReminders(false);
  assert.ok(typeof result.sent === "number");
  assert.ok(typeof result.total === "number");
  assert.ok(typeof result.cleaned === "number");
});
