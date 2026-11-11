import type { Card } from "@/types/lexilo";

export function speakText(text: string, lang = "en-US"): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}

export function speakCard(card: Pick<Card, "front">): void {
  speakText(card.front);
}

export function triggerHaptic(durationMs = 10): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Ignore unsupported haptic environments
    }
  }
}
