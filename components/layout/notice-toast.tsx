"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Notice } from "@/types/lexilo";

export function NoticeToast({ notice }: { notice: Notice | null }) {
  if (!notice) return null;

  const isSuccess = notice.kind === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-24 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-[0_14px_30px_-8px_rgba(15,23,42,0.35),inset_0_1.5px_0_rgba(255,255,255,0.25)] md:bottom-6 ${
        isSuccess ? "bg-[#047857]" : "bg-[#dc2626]"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} className="shrink-0" />
      ) : (
        <AlertCircle size={18} className="shrink-0" />
      )}
      <span>{notice.text}</span>
    </div>
  );
}
