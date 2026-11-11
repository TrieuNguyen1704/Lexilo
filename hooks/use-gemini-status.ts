"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  fetchServerGeminiStatus,
  getGeminiConfig,
  getServerGeminiStatus,
  hasActiveGeminiConfig,
} from "@/lib/services/gemini";

const GEMINI_CONFIG_EVENT = "lexilo-gemini-config-changed";

export function emitGeminiConfigChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GEMINI_CONFIG_EVENT));
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(GEMINI_CONFIG_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(GEMINI_CONFIG_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useGeminiStatus(): {
  active: boolean;
  model: string;
  serverConfigured: boolean;
} {
  useEffect(() => {
    void fetchServerGeminiStatus().then(() => {
      emitGeminiConfigChange();
    });
  }, []);

  const active = useSyncExternalStore(
    subscribe,
    () => hasActiveGeminiConfig(),
    () => false,
  );
  const model = useSyncExternalStore(
    subscribe,
    () => getGeminiConfig().model,
    () => "gemini-3.5-flash",
  );
  const serverConfigured = useSyncExternalStore(
    subscribe,
    () => getServerGeminiStatus().configured,
    () => false,
  );

  return { active, model, serverConfigured };
}
