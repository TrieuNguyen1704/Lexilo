"use client";

import type { WeekDayStat } from "@/types/navigation";

interface WeeklyRhythmChartProps {
  week: WeekDayStat[];
}

export function WeeklyRhythmChart({ week }: WeeklyRhythmChartProps) {
  const maxWeekCount = Math.max(1, ...week.map((w) => w.count));
  const activeDaysCount = week.filter((w) => w.count > 0).length;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between px-1">
        <span className="text-xs font-extrabold text-slate-700">Nhịp học 7 ngày qua</span>
        <span className="text-[11px] font-bold text-slate-600">
          {activeDaysCount}/7 ngày hoạt động
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 py-1 sm:gap-2">
        {week.map((day) => {
          const hasLearned = day.count > 0;
          const barHeightPercent = Math.max(
            14,
            Math.min(100, Math.round((day.count / maxWeekCount) * 100)),
          );

          return (
            <div
              key={day.dateStr}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-all ${
                day.isToday
                  ? "bg-orange-100/75 shadow-xs ring-2 ring-[#ff6b4a]/45"
                  : "hover:bg-violet-50/60"
              }`}
            >
              <span
                className={`text-[11px] font-extrabold ${
                  hasLearned ? "text-[#c2410c]" : "text-slate-400"
                }`}
              >
                {hasLearned ? `${day.count}` : "-"}
              </span>

              <div className="flex h-24 w-full items-end overflow-hidden rounded-xl bg-slate-100/90 p-0.5 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)]">
                <div
                  className={`w-full rounded-lg transition-all duration-700 ${
                    hasLearned
                      ? day.isToday
                        ? "bg-gradient-to-t from-[#ff4d2e] to-[#ff9800] shadow-xs"
                        : "bg-gradient-to-t from-[#7c3aed] to-[#a78bfa]"
                      : "bg-transparent"
                  }`}
                  style={{ height: hasLearned ? `${barHeightPercent}%` : "0%" }}
                />
              </div>

              <div className="flex flex-col items-center">
                <span
                  className={`text-[11px] font-extrabold ${
                    day.isToday
                      ? "text-[#c2410c]"
                      : hasLearned
                      ? "text-slate-800"
                      : "text-slate-500"
                  }`}
                >
                  {day.label}
                </span>
                {day.isToday && (
                  <span className="text-[9px] leading-none font-black text-[#c2410c] uppercase">
                    Nay
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
