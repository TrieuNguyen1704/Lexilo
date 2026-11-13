"use client";

import { useEffect } from "react";
import { checkAllNotifications, syncPushSubscription } from "@/lib/services/notifications";
import type { Card } from "@/types/lexilo";

export function useStudyNotifications(ready: boolean, cards: Card[]) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSw = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          const dueCount = cards.filter((c) => c.due <= Date.now()).length;
          void syncPushSubscription(dueCount);
        })
        .catch(() => {});
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
      registerSw();
      return;
    }

    window.addEventListener("load", registerSw);
    return () => window.removeEventListener("load", registerSw);
  }, [cards]);

  useEffect(() => {
    if (!ready) return;

    void checkAllNotifications(cards);
    const interval = window.setInterval(() => {
      void checkAllNotifications(cards);
    }, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void checkAllNotifications(cards);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [ready, cards]);
}

