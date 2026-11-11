"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notice } from "@/types/lexilo";

export function useNotice(durationMs = 3500) {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [notice, durationMs]);

  const showNotice = useCallback((kind: Notice["kind"], text: string) => {
    setNotice({ kind, text });
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  return { notice, showNotice, clearNotice };
}
