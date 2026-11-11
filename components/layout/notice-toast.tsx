"use client";

import type { Notice } from "@/types/lexilo";

export function NoticeToast({ notice }: { notice: Notice | null }) {
  if (!notice) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-20 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-xl md:bottom-6 ${
        notice.kind === "success" ? "bg-[#17a673]" : "bg-red-600"
      }`}
    >
      {notice.text}
    </div>
  );
}
