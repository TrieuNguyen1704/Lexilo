"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellCheck,
  BellOff,
  Clock,
  Send,
  Smartphone,
  Sparkles,
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
import {
  getCustomReminderTime,
  getNotificationPermission,
  isDailyReminderEnabled,
  isNotificationSupported,
  isNotificationsEnabled,
  isRealtimeNotifEnabled,
  NotificationStatus,
  requestNotificationPermission,
  sendNotification,
  setCustomReminderTime,
  setDailyReminderEnabled,
  setNotificationsEnabled,
  setRealtimeNotifEnabled,
} from "@/lib/notifications";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueCount: number;
  onNotice: (kind: "success" | "error", text: string) => void;
}

const POPULAR_TIMES = ["07:30", "09:00", "12:30", "18:00", "20:00", "21:30"];

export function NotificationDialog({
  open,
  onOpenChange,
  dueCount,
  onNotice,
}: NotificationDialogProps) {
  const [status, setStatus] = useState<NotificationStatus>("default");
  const [enabled, setEnabled] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [customTime, setCustomTime] = useState("20:00");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setStatus(getNotificationPermission());
    setEnabled(isNotificationsEnabled());
    setRealtimeEnabled(isRealtimeNotifEnabled());
    setDailyEnabled(isDailyReminderEnabled());
    setCustomTime(getCustomReminderTime());
  }, [open]);

  async function handleRequestPermission() {
    const success = await requestNotificationPermission();
    const newStatus = getNotificationPermission();
    setStatus(newStatus);
    setEnabled(success);

    if (success) {
      onNotice("success", "Đã kích hoạt thông báo thành công!");
    } else {
      if (newStatus === "denied") {
        onNotice(
          "error",
          "Quyền thông báo đang bị từ chối. Mở Cài đặt iPhone -> Thông báo -> Lexilo để bật."
        );
      } else {
        onNotice("error", "Chưa cấp quyền thông báo.");
      }
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
        : "Đã tắt thông báo tức thì."
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
        : "Đã tắt nhắc nhở định kỳ."
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
        `Hệ thống hoạt động tốt. Hiện bạn có ${dueCount} thẻ cần ôn tập.`
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#ff6b4a] dark:bg-orange-950/50 flex items-center justify-center font-bold shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Cài đặt thông báo ôn tập
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tùy chỉnh thông báo tức thì và nhắc nhở theo giờ bạn muốn
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Permission Status Banner */}
          {status === "granted" && enabled ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 sm:p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    Đã cấp quyền thông báo
                  </p>
                </div>
                <BellCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            </div>
          ) : status === "denied" ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
              <div className="flex items-center gap-2">
                <BellOff className="w-4 h-4 text-rose-600 shrink-0" />
                <p className="text-xs font-bold text-rose-950 dark:text-rose-200">
                  Quyền thông báo đang bị tắt
                </p>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                Vào <strong>Cài đặt iPhone</strong> → <strong>Thông báo</strong> → <strong>Lexilo</strong> → bật <strong>Cho phép thông báo</strong>.
              </p>
            </div>
          ) : (
            <Button
              onClick={handleRequestPermission}
              className="w-full bg-[#ff6b4a] hover:bg-[#e85a39] text-white font-bold text-xs sm:text-sm h-11 rounded-xl gap-2 shadow-sm"
            >
              <Bell className="w-4 h-4" /> Bật thông báo ngay
            </Button>
          )}

          {/* ================= LUỒNG 1: THÔNG BÁO TỨC THÌ KHI CÓ THẺ ĐẾN HẠN ================= */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#ff6b4a] flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    1. Thông báo tức thì khi có thẻ đến hạn
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Bắn thông báo ngay khi có thẻ vừa đến hạn FSRS
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={realtimeEnabled}
                onClick={handleToggleRealtime}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  realtimeEnabled ? "bg-[#ff6b4a]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    realtimeEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground pl-9">
              {realtimeEnabled
                ? "🟢 Đang bật: Cứ khi nào có từ vựng đến hạn học lại là điện thoại sẽ báo ngay."
                : "⚪ Đang tắt: Sẽ không báo đột xuất trong ngày."}
            </p>
          </div>

          {/* ================= LUỒNG 2: NHẮC NHỞ ĐỊNH KỲ THEO GIỜ TỰ CHỌN ================= */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    2. Nhắc nhở cố định mỗi ngày
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Tự đặt giờ cố định để nhắc tổng hợp thẻ cần học
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={dailyEnabled}
                onClick={handleToggleDaily}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  dailyEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    dailyEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {dailyEnabled && (
              <div className="pt-1 pl-9 space-y-2.5">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Nhập hoặc chọn giờ bạn muốn nhắc:
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={customTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className="text-sm font-bold h-10 w-36 rounded-xl border-[#6c63ff]/30 text-center"
                    />
                    <span className="text-xs text-muted-foreground">
                      (Hàng ngày lúc <strong>{customTime}</strong>)
                    </span>
                  </div>
                </div>

                {/* Quick preset chips */}
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Chọn nhanh mốc giờ phổ biến:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_TIMES.map((timeStr) => (
                      <button
                        key={timeStr}
                        type="button"
                        onClick={() => handleTimeChange(timeStr)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          customTime === timeStr
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-muted/40 text-foreground border-border hover:bg-muted"
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

          {/* Test Notification Button */}
          {status === "granted" && (
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={testing}
              className="w-full text-xs h-10 rounded-xl gap-2 mt-1"
            >
              <Send className="w-3.5 h-3.5 text-[#ff6b4a]" />
              {testing ? "Đang gửi..." : "Gửi thử 1 thông báo để kiểm tra chuông"}
            </Button>
          )}

          {/* Quick hint */}
          <div className="rounded-xl bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Mẹo: Icon Lexilo ngoài Màn hình chính sẽ có chấm đỏ đếm số từ cần học.</span>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 rounded-lg"
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
