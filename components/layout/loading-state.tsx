"use client";

import { Brain } from "lucide-react";

export function LoadingState() {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <div className="clay-card rounded-3xl px-8 py-7 text-center">
        <span className="mx-auto grid size-14 animate-pulse place-items-center rounded-2xl bg-violet-100 text-[#6d28d9] shadow-[inset_0_2px_0_rgba(255,255,255,0.85)]">
          <Brain size={28} />
        </span>
        <p className="font-display mt-3.5 text-base font-semibold text-slate-600">
          Đang mở dữ liệu Lexilo...
        </p>
      </div>
    </div>
  );
}
