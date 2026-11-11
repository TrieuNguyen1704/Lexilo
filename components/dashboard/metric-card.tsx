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
    <div className="clay-card-interactive flex items-center gap-4 rounded-3xl p-4 sm:p-5">
      <span
        className="grid size-12 shrink-0 place-items-center rounded-2xl shadow-[inset_0_2px_0_rgba(255,255,255,0.75)]"
        style={{ background: `${color}18`, color }}
      >
        <Icon size={22} strokeWidth={2.4} />
      </span>
      <div className="min-w-0">
        <b className="font-display block text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
          {value}
        </b>
        <span className="block truncate text-xs font-bold text-slate-600 sm:text-sm">
          {label}
        </span>
      </div>
    </div>
  );
}
