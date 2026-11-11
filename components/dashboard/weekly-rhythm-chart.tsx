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
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Nhịp học 7 ngày qua
        </span>
        <span className="text-[11px] font-semibold text-slate-500">
          {activeDaysCount}/7 ngày hoạt động
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 pt-1 pb-1 sm:gap-2">
        {week.map((day) => {
          const hasLearned = day.count > 0;
          const barHeightPercent = Math.max(
            14,
            Math.min(100, Math.round((day.count / maxWeekCount) * 100)),
          );

          return (
            <div
              key={day.dateStr}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all ${
                day.isToday
                  ? "bg-orange-100/70 shadow-xs ring-2 ring-[#ff5e3a]/40 dark:bg-orange-950/50"
                  : "hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
              }`}
            >
              <span
                className={`text-[10px] font-black ${
                  hasLearned ? "text-[#ff5e3a]" : "text-slate-300 dark:text-slate-600"
                }`}
              >
                {hasLearned ? `${day.count}` : "-"}
              </span>

              <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                <div
                  className={`w-full rounded-md transition-all duration-700 ${
                    hasLearned
                      ? day.isToday
                        ? "bg-gradient-to-t from-[#ff4d2e] to-[#ff9800] shadow-xs"
                        : "bg-gradient-to-t from-[#6366f1] to-[#818cf8]"
                      : "bg-transparent"
                  }`}
                  style={{ height: hasLearned ? `${barHeightPercent}%` : "0%" }}
                />
              </div>

              <div className="flex flex-col items-center">
                <span
                  className={`text-[11px] font-black ${
                    day.isToday
                      ? "text-[#ff5e3a]"
                      : hasLearned
                      ? "text-slate-800 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {day.label}
                </span>
                {day.isToday && (
                  <span className="text-[9px] leading-none font-extrabold text-[#ff5e3a] uppercase">
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
