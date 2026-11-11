"use client";

import { useEffect } from "react";
import { checkAllNotifications } from "@/lib/services/notifications";
import type { Card } from "@/types/lexilo";

export function useStudyNotifications(ready: boolean, cards: Card[]) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSw = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
      registerSw();
      return;
    }

    window.addEventListener("load", registerSw);
    return () => window.removeEventListener("load", registerSw);
  }, []);

  useEffect(() => {
    if (!ready) return;

    void checkAllNotifications(cards);
    const interval = window.setInterval(() => {
      void checkAllNotifications(cards);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [ready, cards]);
}
