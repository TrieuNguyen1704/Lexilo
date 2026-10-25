"use client";

import { useMemo } from "react";
import { Flame, Sparkles, Trophy, Calendar, CheckCircle2 } from "lucide-react";
import { Review } from "@/lib/lexilo";

interface StreakUsagiProps {
  reviews: Review[];
  todayCount: number;
  dueCount: number;
  week: { label: string; count: number; dateStr: string; isToday: boolean }[];
}

// Calculate real consecutive days streak from review history
export function calculateStreak(reviews: Review[]): { currentStreak: number; bestStreak: number } {
  if (!reviews || reviews.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Get unique sorted dates in descending order (YYYY-MM-DD)
  const uniqueDates = Array.from(new Set(reviews.map((r) => r.date))).sort().reverse();
  if (uniqueDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let currentStreak = 0;
  let checkDate = new Date();

  // If user reviewed today, streak starts from today
  // If not, check if they reviewed yesterday to keep streak alive
  if (uniqueDates.includes(todayStr)) {
    checkDate = new Date();
  } else if (uniqueDates.includes(yesterdayStr)) {
    checkDate = yesterday;
  } else {
    // Streak broken
    return { currentStreak: 0, bestStreak: calculateBestStreak(uniqueDates) };
  }

  while (true) {
    const dateKey = checkDate.toISOString().slice(0, 10);
    if (uniqueDates.includes(dateKey)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const bestStreak = Math.max(currentStreak, calculateBestStreak(uniqueDates));
  return { currentStreak, bestStreak };
}

function calculateBestStreak(sortedDescDates: string[]): number {
  if (!sortedDescDates.length) return 0;
  let max = 1;
  let current = 1;

  for (let i = 0; i < sortedDescDates.length - 1; i++) {
    const curr = new Date(sortedDescDates[i]);
    const next = new Date(sortedDescDates[i + 1]);
    const diffDays = Math.round((curr.getTime() - next.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      current++;
      if (current > max) max = current;
    } else {
      current = 1;
    }
  }

  return max;
}

// SVG Character of Usagi (The energetic yellow rabbit mascot)
function UsagiMascot({ mood }: { mood: "cheering" | "happy" | "waiting" }) {
  return (
    <div className="relative flex items-center justify-center select-none">
      <svg
        viewBox="0 0 160 170"
        className="w-28 h-28 sm:w-32 sm:h-32 drop-shadow-md transition-transform duration-300 hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glow behind Usagi */}
        <circle cx="80" cy="95" r="50" fill={mood === "cheering" ? "#ffeb99" : "#fff8e1"} opacity="0.6" />

        {/* Ears */}
        {/* Left Ear */}
        <g className={mood === "cheering" ? "animate-bounce" : ""}>
          <path
            d="M58 52 C52 20 40 10 46 8 C54 6 68 28 67 50 Z"
            fill="#FFE875"
            stroke="#2B2015"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M54 44 C50 24 44 17 48 16 C53 15 62 28 62 43 Z"
            fill="#FFB6C1"
          />
        </g>

        {/* Right Ear */}
        <g className={mood === "cheering" ? "animate-bounce" : ""}>
          <path
            d="M102 52 C108 20 120 10 114 8 C106 6 92 28 93 50 Z"
            fill="#FFE875"
            stroke="#2B2015"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M106 44 C110 24 116 17 112 16 C107 15 98 28 98 43 Z"
            fill="#FFB6C1"
          />
        </g>

        {/* Tail */}
        <ellipse cx="80" cy="142" rx="10" ry="8" fill="#FFF3B0" stroke="#2B2015" strokeWidth="3" />

        {/* Body */}
        <path
          d="M80 50 C44 50 36 78 36 102 C36 128 54 146 80 146 C106 146 124 128 124 102 C124 78 116 50 80 50 Z"
          fill="#FFE875"
          stroke="#2B2015"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* White Tummy patch */}
        <ellipse cx="80" cy="112" rx="26" ry="22" fill="#FFF8D6" />

        {/* Little Feet */}
        <ellipse cx="60" cy="144" rx="10" ry="7" fill="#FFE875" stroke="#2B2015" strokeWidth="3" />
        <ellipse cx="100" cy="144" rx="10" ry="7" fill="#FFE875" stroke="#2B2015" strokeWidth="3" />

        {/* Rosy Cheeks */}
        <circle cx="53" cy="98" r="7.5" fill="#FF8DA1" opacity="0.85" />
        <circle cx="107" cy="98" r="7.5" fill="#FF8DA1" opacity="0.85" />

        {/* Eyes & Eyebrows */}
        {mood === "cheering" ? (
          <>
            {/* Happy Curved Eyes (^_^) */}
            <path
              d="M58 87 Q65 79 72 87"
              stroke="#2B2015"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M88 87 Q95 79 102 87"
              stroke="#2B2015"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            {/* Joyful Eyebrows */}
            <path d="M59 75 Q65 72 71 75" stroke="#2B2015" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M89 75 Q95 72 101 75" stroke="#2B2015" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            {/* Big Round Curious Eyes */}
            <circle cx="65" cy="85" r="5" fill="#2B2015" />
            <circle cx="63.5" cy="83.5" r="1.8" fill="white" />
            <circle cx="95" cy="85" r="5" fill="#2B2015" />
            <circle cx="93.5" cy="83.5" r="1.8" fill="white" />
            {/* Cute slanted eyebrows */}
            <path d="M60 76 Q65 73 70 77" stroke="#2B2015" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M90 77 Q95 73 100 76" stroke="#2B2015" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        )}

        {/* Cute Usagi Mouth */}
        {mood === "cheering" ? (
          /* Wide Open Happy Mouth: "YAHA!" */
          <path
            d="M74 95 Q80 94 86 95 C88 106 72 106 74 95 Z"
            fill="#E2435A"
            stroke="#2B2015"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ) : mood === "happy" ? (
          /* Small cheerful smile :3 */
          <path
            d="M74 96 Q77 99 80 96 Q83 99 86 96"
            stroke="#2B2015"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          /* Little curious dot mouth */
          <ellipse cx="80" cy="96" rx="2.5" ry="3" fill="#2B2015" />
        )}

        {/* Arms */}
        {mood === "cheering" ? (
          <>
            {/* Arms raised up celebrating! */}
            <path
              d="M40 92 C30 80 26 66 36 60 C42 56 48 76 46 90"
              fill="#FFE875"
              stroke="#2B2015"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <path
              d="M120 92 C130 80 134 66 124 60 C118 56 112 76 114 90"
              fill="#FFE875"
              stroke="#2B2015"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Celebration sparkles around paws */}
            <path d="M25 50 L28 44 L34 46 L29 51 L31 57 L25 53 L19 56 L22 50 L18 45 L24 44 Z" fill="#FFA500" />
            <path d="M135 50 L138 44 L144 46 L139 51 L141 57 L135 53 L129 56 L132 50 L128 45 L134 44 Z" fill="#FFA500" />
          </>
        ) : (
          <>
            {/* Relaxed cute paws resting on tummy */}
            <path
              d="M40 98 C46 104 56 108 62 104 C64 100 56 94 48 94 Z"
              fill="#FFE875"
              stroke="#2B2015"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M120 98 C114 104 104 108 98 104 C96 100 104 94 112 94 Z"
              fill="#FFE875"
              stroke="#2B2015"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}

export function StreakUsagi({ reviews, todayCount, dueCount, week }: StreakUsagiProps) {
  const { currentStreak, bestStreak } = useMemo(() => calculateStreak(reviews), [reviews]);

  // Usagi's current mood and dialogue
  const { mood, speech, subtext } = useMemo(() => {
    if (todayCount >= 10) {
      return {
        mood: "cheering" as const,
        speech: "YAHA! 🔥 Tuyệt đỉnh hôm nay!",
        subtext: `Bạn đã ôn tập ${todayCount} lượt thẻ rồi! Chuỗi ${currentStreak} ngày rực rỡ, Usagi tự hào về bạn! ✨`,
      };
    }
    if (todayCount > 0) {
      return {
        mood: "happy" as const,
        speech: "Ura ura! Giữ chuỗi thành công! 🌟",
        subtext: `Hôm nay bạn đã ôn ${todayCount} thẻ. ${dueCount > 0 ? `Còn ${dueCount} thẻ nữa là hoàn tất mục tiêu!` : "Hết thẻ đến hạn rồi, quá đỉnh!"}`,
      };
    }
    if (currentStreak > 0) {
      return {
        mood: "waiting" as const,
        speech: "Haa?! Chuỗi lửa đang chờ bạn! ⚡",
        subtext: `Chuỗi ${currentStreak} ngày đang cháy! Ôn ngay ít nhất 1 thẻ hôm nay để không bị đứt chuỗi nhé!`,
      };
    }
    return {
      mood: "waiting" as const,
      speech: "Yaha! Bắt đầu chuỗi ngày mới nào! 🚀",
      subtext: `Bạn đang có ${dueCount} thẻ cần ôn. Bắt đầu ngay hôm nay để thắp sáng chuỗi lửa 1 ngày nhé!`,
    };
  }, [todayCount, dueCount, currentStreak]);

  // Find max count for scaling week bars
  const maxWeekCount = Math.max(1, ...week.map((w) => w.count));

  return (
    <div className="rounded-[28px] border border-orange-200/80 bg-gradient-to-br from-[#fffdf7] via-white to-[#fff8ee] p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      {/* Top Header: Streak Flame & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-orange-100/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#ff5e3a] to-[#ff9800] text-white shadow-md shadow-orange-500/25">
            <Flame className="w-6 h-6 animate-pulse fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {currentStreak} Ngày
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-[#ff5e3a] dark:bg-orange-950/50 dark:text-orange-300">
                {currentStreak > 0 ? "Chuỗi đang cháy! 🔥" : "Chưa có chuỗi"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kỷ lục cao nhất: <strong className="text-slate-700 dark:text-slate-300">{bestStreak} ngày</strong>
            </p>
          </div>
        </div>

        {/* Daily Goal badge */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-orange-100 dark:border-slate-700 shadow-xs">
          <Calendar className="w-4 h-4 text-[#ff5e3a]" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Hôm nay: <span className="text-[#ff5e3a]">{todayCount}</span> lượt ôn
          </span>
        </div>
      </div>

      {/* Middle Section: Usagi Mascot & Speech Bubble */}
      <div className="my-4 flex flex-col sm:flex-row items-center gap-4 bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-pink-50/40 dark:from-slate-800/50 dark:to-slate-800/30 p-3.5 sm:p-4 rounded-2xl border border-amber-200/50 dark:border-slate-700/60">
        <div className="shrink-0">
          <UsagiMascot mood={mood} />
        </div>

        {/* Speech Bubble */}
        <div className="relative flex-1 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 dark:border-slate-700 shadow-xs">
          {/* Bubble Pointer on desktop */}
          <div className="hidden sm:block absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-slate-900 border-l border-b border-amber-200/80 dark:border-slate-700 rotate-45" />

          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              {speech}
            </h4>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {subtext}
          </p>
        </div>
      </div>

      {/* Bottom Section: 7-Day Rhythm Chart */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Nhịp học 7 ngày qua
          </span>
          <span className="text-[11px] text-slate-400">
            {week.filter((w) => w.count > 0).length}/7 ngày hoạt động
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2 pb-1">
          {week.map((day, idx) => {
            const hasLearned = day.count > 0;
            const barHeightPercent = Math.max(14, Math.min(100, Math.round((day.count / maxWeekCount) * 100)));

            return (
              <div
                key={idx}
                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-xl transition-all ${
                  day.isToday
                    ? "bg-orange-100/60 dark:bg-orange-950/40 ring-2 ring-[#ff5e3a]/40"
                    : "hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                }`}
              >
                {/* Count badge on top of bar */}
                <span
                  className={`text-[10px] font-bold ${
                    hasLearned ? "text-[#ff5e3a]" : "text-slate-300 dark:text-slate-600"
                  }`}
                >
                  {hasLearned ? `${day.count}` : "-"}
                </span>

                {/* Vertical Bar */}
                <div className="w-full h-24 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-end overflow-hidden p-0.5">
                  <div
                    className={`w-full rounded-md transition-all duration-500 ${
                      hasLearned
                        ? day.isToday
                          ? "bg-gradient-to-t from-[#ff5e3a] to-[#ff9800]"
                          : "bg-gradient-to-t from-[#6c63ff] to-[#8b84ff]"
                        : "bg-transparent"
                    }`}
                    style={{ height: hasLearned ? `${barHeightPercent}%` : "0%" }}
                  />
                </div>

                {/* Day label */}
                <div className="flex flex-col items-center">
                  <span
                    className={`text-[11px] font-bold ${
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
                    <span className="text-[9px] font-extrabold text-[#ff5e3a] leading-none uppercase">
                      Nay
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
