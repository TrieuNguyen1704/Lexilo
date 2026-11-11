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
      <DialogContent className="max-h-[88vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader className="pb-2 text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 font-bold text-[#ff6b4a] dark:bg-orange-950/50">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold sm:text-lg">
                Cài đặt thông báo ôn tập
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
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
        "Kiểm tra thông báo Lexilo! 🔔",
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
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 sm:p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                <p className="text-xs font-bold text-emerald-950 sm:text-sm dark:text-emerald-200">
                  Đã cấp quyền thông báo
                </p>
              </div>
              <BellCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            </div>
          </div>
        ) : status === "denied" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-center gap-2">
              <BellOff className="h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-xs font-bold text-rose-950 dark:text-rose-200">
                Quyền thông báo đang bị tắt
              </p>
            </div>
            <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
              Vào <strong>Cài đặt iPhone</strong> → <strong>Thông báo</strong> →{" "}
              <strong>Lexilo</strong> → bật <strong>Cho phép thông báo</strong>.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleRequestPermission}
            className="h-11 w-full gap-2 rounded-xl bg-[#ff6b4a] text-xs font-bold text-white shadow-sm hover:bg-[#e85a39] sm:text-sm"
          >
            <Bell className="h-4 w-4" /> Bật thông báo ngay
          </Button>
        )}

        <div className="space-y-2 rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 font-bold text-[#ff6b4a]">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground sm:text-sm">
                  1. Thông báo tức thì khi có thẻ đến hạn
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Bắn thông báo ngay khi có thẻ vừa đến hạn FSRS
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={realtimeEnabled}
              onToggle={handleToggleRealtime}
              activeClass="bg-[#ff6b4a]"
            />
          </div>
          <p className="pl-9 text-[11px] text-muted-foreground">
            {realtimeEnabled
              ? "🟢 Đang bật: Cứ khi nào có từ vựng đến hạn học lại là điện thoại sẽ báo ngay."
              : "⚪ Đang tắt: Sẽ không báo đột xuất trong ngày."}
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 font-bold text-blue-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground sm:text-sm">
                  2. Nhắc nhở cố định mỗi ngày
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Tự đặt giờ cố định để nhắc tổng hợp thẻ cần học
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={dailyEnabled}
              onToggle={handleToggleDaily}
              activeClass="bg-blue-600"
            />
          </div>

          {dailyEnabled && (
            <div className="space-y-2.5 pt-1 pl-9">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Nhập hoặc chọn giờ bạn muốn nhắc:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={customTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="h-10 w-36 rounded-xl border-[#6c63ff]/30 text-center text-sm font-bold"
                  />
                  <span className="text-xs text-muted-foreground">
                    (Hàng ngày lúc <strong>{customTime}</strong>)
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Chọn nhanh mốc giờ phổ biến:</p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_REMINDER_TIMES.map((timeStr) => (
                    <button
                      key={timeStr}
                      type="button"
                      onClick={() => handleTimeChange(timeStr)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                        customTime === timeStr
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-border bg-muted/40 text-foreground hover:bg-muted"
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
            className="mt-1 h-10 w-full gap-2 rounded-xl text-xs"
          >
            <Send className="h-3.5 w-3.5 text-[#ff6b4a]" />
            {testing ? "Đang gửi..." : "Gửi thử 1 thông báo để kiểm tra chuông"}
          </Button>
        )}

        <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
          <Smartphone className="h-4 w-4 shrink-0 text-slate-500" />
          <span>Mẹo: Icon Lexilo ngoài Màn hình chính sẽ có chấm đỏ đếm số từ cần học.</span>
        </div>
      </div>

      <div className="flex justify-end border-t pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-8 rounded-lg text-xs"
        >
          Đóng
        </Button>
      </div>
    </>
  );
}

function ToggleSwitch({
  checked,
  onToggle,
  activeClass,
}: {
  checked: boolean;
  onToggle: () => void;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? activeClass : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
