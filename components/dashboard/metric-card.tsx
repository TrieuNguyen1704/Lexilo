"use client";

import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
}

export function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
  return (
    <div className="tap-press flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <span
        className="grid size-12 shrink-0 place-items-center rounded-2xl shadow-xs"
        style={{ background: `${color}15`, color }}
      >
        <Icon size={22} className="stroke-[2.5]" />
      </span>
      <div className="min-w-0">
        <b className="block text-2xl font-black tracking-tight text-slate-900">{value}</b>
        <span className="block truncate text-xs font-semibold text-slate-500 sm:text-sm">
          {label}
        </span>
      </div>
    </div>
  );
}
