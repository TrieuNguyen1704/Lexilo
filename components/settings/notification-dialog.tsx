"use client";

import { useState } from "react";
import {
  Bell,
  BellCheck,
  BellOff,
  Clock,
  Send,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { POPULAR_REMINDER_TIMES } from "@/lib/config/constants";
import {
  getCustomReminderTime,
  getNotificationPermission,
  isDailyReminderEnabled,
  isNotificationsEnabled,
  isRealtimeNotifEnabled,
  requestNotificationPermission,
  sendNotification,
  setCustomReminderTime,
  setDailyReminderEnabled,
  setRealtimeNotifEnabled,
} from "@/lib/services/notifications";
import type { Notice } from "@/types/lexilo";
import type { NotificationStatus } from "@/types/navigation";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueCount: number;
  onNotice: (kind: Notice["kind"], text: string) => void;
}

export function NotificationDialog(props: NotificationDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="clay-card max-h-[88vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-[28px] p-5 sm:p-6">
        <DialogHeader className="pb-2 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-[#e04826] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.85)]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900">
                Cài đặt thông báo ôn tập
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-600">
                Tùy chỉnh thông báo tức thì và nhắc nhở theo giờ bạn muốn
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {props.open && <NotificationBody {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function NotificationBody({
  onOpenChange,
  dueCount,
  onNotice,
}: NotificationDialogProps) {
  const [status, setStatus] = useState<NotificationStatus>(() => getNotificationPermission());
  const [enabled, setEnabled] = useState(() => isNotificationsEnabled());
  const [realtimeEnabled, setRealtimeEnabled] = useState(() => isRealtimeNotifEnabled());
  const [dailyEnabled, setDailyEnabled] = useState(() => isDailyReminderEnabled());
  const [customTime, setCustomTime] = useState(() => getCustomReminderTime());
  const [testing, setTesting] = useState(false);

  async function handleRequestPermission() {
    const success = await requestNotificationPermission();
    const newStatus = getNotificationPermission();
    setStatus(newStatus);
    setEnabled(success);

    if (success) {
      onNotice("success", "Đã kích hoạt thông báo thành công!");
    } else if (newStatus === "denied") {
      onNotice(
        "error",
        "Quyền thông báo đang bị từ chối. Mở Cài đặt iPhone -> Thông báo -> Lexilo để bật.",
      );
    } else {
      onNotice("error", "Chưa cấp quyền thông báo.");
    }
  }

  function handleToggleRealtime() {
    const nextVal = !realtimeEnabled;
    setRealtimeEnabled(nextVal);
    setRealtimeNotifEnabled(nextVal);
    onNotice(
      "success",
      nextVal
        ? "Đã bật: Nhận thông báo tức thì khi có thẻ đến hạn."
        : "Đã tắt thông báo tức thì.",
    );
  }

  function handleToggleDaily() {
    const nextVal = !dailyEnabled;
    setDailyEnabled(nextVal);
    setDailyReminderEnabled(nextVal);
    onNotice(
      "success",
      nextVal
        ? `Đã bật nhắc nhở mỗi ngày vào ${customTime}.`
        : "Đã tắt nhắc nhở định kỳ.",
    );
  }

  function handleTimeChange(val: string) {
    if (!val) return;
    setCustomTime(val);
    setCustomReminderTime(val);
    onNotice("success", `Đã lưu giờ nhắc nhở mỗi ngày: ${val}`);
  }

  async function handleTestNotification() {
    setTesting(true);
    try {
      const sent = await sendNotification(
        "Kiểm tra thông báo Lexilo",
        `Hệ thống hoạt động tốt. Hiện bạn có ${dueCount} thẻ cần ôn tập.`,
      );
      if (sent) {
        onNotice("success", "Đã gửi thông báo thử! Kiểm tra màn hình khóa hoặc thanh thông báo.");
      } else {
        onNotice("error", "Không thể gửi thông báo. Hãy kiểm tra cài đặt thông báo của thiết bị.");
      }
    } catch {
      onNotice("error", "Lỗi gửi thông báo thử.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <div className="space-y-4 py-1">
        {status === "granted" && enabled ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/85 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-600" />
                <p className="text-xs font-extrabold text-emerald-950 sm:text-sm">
                  Đã cấp quyền thông báo
                </p>
              </div>
              <BellCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            </div>
          </div>
        ) : status === "denied" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/85 p-3.5">
            <div className="flex items-center gap-2">
              <BellOff className="h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-xs font-extrabold text-rose-950">
                Quyền thông báo đang bị tắt
              </p>
            </div>
            <p className="mt-1 text-[11px] font-medium text-rose-700">
              Vào <strong>Cài đặt iPhone</strong> → <strong>Thông báo</strong> →{" "}
              <strong>Lexilo</strong> → bật <strong>Cho phép thông báo</strong>.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleRequestPermission}
            className="clay-cta h-11 w-full gap-2 rounded-2xl bg-[#7c3aed] text-xs font-bold text-white hover:bg-[#6d28d9] sm:text-sm"
          >
            <Bell className="h-4 w-4" /> Bật thông báo ngay
          </Button>
        )}

        <div className="clay-surface space-y-2 rounded-2xl p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#e04826]">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900 sm:text-sm">
                  1. Thông báo tức thì khi có thẻ đến hạn
                </p>
                <p className="text-[11px] font-medium text-slate-600">
                  Bắn thông báo ngay khi có thẻ vừa đến hạn FSRS
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={realtimeEnabled}
              label="Thông báo tức thì"
              onToggle={handleToggleRealtime}
              activeClass="bg-[#7c3aed]"
            />
          </div>
          <p className="pl-10 text-[11px] font-medium text-slate-600">
            {realtimeEnabled
              ? "Đang bật: Khi có từ vựng đến hạn học lại, thiết bị sẽ báo ngay."
              : "Đang tắt: Sẽ không báo đột xuất trong ngày."}
          </p>
        </div>

        <div className="clay-surface space-y-3 rounded-2xl p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-[#6d28d9]">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900 sm:text-sm">
                  2. Nhắc nhở cố định mỗi ngày
                </p>
                <p className="text-[11px] font-medium text-slate-600">
                  Tự đặt giờ cố định để nhắc tổng hợp thẻ cần học
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={dailyEnabled}
              label="Nhắc nhở cố định mỗi ngày"
              onToggle={handleToggleDaily}
              activeClass="bg-[#7c3aed]"
            />
          </div>

          {dailyEnabled && (
            <div className="space-y-2.5 pt-1 pl-10">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Nhập hoặc chọn giờ bạn muốn nhắc:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={customTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    aria-label="Giờ nhắc nhở"
                    className="h-10 w-36 rounded-2xl border-[var(--border)] bg-white text-center text-sm font-bold"
                  />
                  <span className="text-xs font-medium text-slate-600">
                    (Hàng ngày lúc <strong>{customTime}</strong>)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-600">Chọn nhanh mốc giờ phổ biến:</p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_REMINDER_TIMES.map((timeStr) => (
                    <button
                      key={timeStr}
                      type="button"
                      onClick={() => handleTimeChange(timeStr)}
                      className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition ${
                        customTime === timeStr
                          ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                          : "border-[var(--border)] bg-white text-slate-700 hover:bg-violet-50"
                      }`}
                    >
                      {timeStr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {status === "granted" && (
          <Button
            variant="outline"
            onClick={handleTestNotification}
            disabled={testing}
            className="tap-press mt-1 h-10 w-full gap-2 rounded-2xl border-[var(--border)] bg-white text-xs font-extrabold text-slate-800"
          >
            <Send className="h-3.5 w-3.5 text-[#7c3aed]" />
            {testing ? "Đang gửi..." : "Gửi thử 1 thông báo để kiểm tra chuông"}
          </Button>
        )}

        <div className="flex items-center gap-2 rounded-2xl bg-violet-50/70 p-3 text-[11px] font-medium text-slate-600">
          <Smartphone className="h-4 w-4 shrink-0 text-[#6d28d9]" />
          <span>Mẹo: Icon Lexilo ngoài Màn hình chính sẽ có chấm đỏ đếm số từ cần học.</span>
        </div>
      </div>

      <div className="flex justify-end border-t border-[var(--border)] pt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-9 rounded-2xl border-[var(--border)] text-xs font-bold"
        >
          Đóng
        </Button>
      </div>
    </>
  );
}

function ToggleSwitch({
  checked,
  label,
  onToggle,
  activeClass,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
        checked ? activeClass : "bg-slate-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
