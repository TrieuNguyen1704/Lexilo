"use client";

import { Brain } from "lucide-react";

export function LoadingState() {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <div className="text-center">
        <span className="mx-auto grid size-14 animate-pulse place-items-center rounded-2xl bg-[#f0efff] text-[#6258ef]">
          <Brain size={28} />
        </span>
        <p className="mt-3 text-sm font-bold text-slate-500">Đang mở dữ liệu Lexilo...</p>
      </div>
    </div>
  );
}
