"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellCheck,
  BellOff,
  Check,
  Clock,
  ExternalLink,
  Send,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getNotificationPermission,
  getReminderTime,
  isNotificationSupported,
  isNotificationsEnabled,
  NotificationStatus,
  requestNotificationPermission,
  sendNotification,
  setNotificationsEnabled,
  setReminderTime,
} from "@/lib/notifications";

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueCount: number;
  onNotice: (kind: "success" | "error", text: string) => void;
}

const REMINDER_OPTIONS = [
  { value: "08:00", label: "08:00 Sáng (Bắt đầu ngày mới)" },
  { value: "09:00", label: "09:00 Sáng" },
  { value: "12:00", label: "12:00 Trưa (Nghỉ trưa)" },
  { value: "18:00", label: "18:00 Chiều (Tan làm/học)" },
  { value: "20:00", label: "20:00 Tối (Thời gian học tốt nhất)" },
  { value: "21:30", label: "21:30 Tối (Trước khi ngủ)" },
];

export function NotificationDialog({
  open,
  onOpenChange,
  dueCount,
  onNotice,
}: NotificationDialogProps) {
  const [status, setStatus] = useState<NotificationStatus>("default");
  const [enabled, setEnabled] = useState(false);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [isStandalone, setIsStandalone] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setStatus(getNotificationPermission());
    setEnabled(isNotificationsEnabled());
    setSelectedTime(getReminderTime());

    // Check if running as iOS Home Screen PWA
    const standalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true);
    setIsStandalone(Boolean(standalone));
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
          "Quyền thông báo đang bị từ chối. Hãy mở Cài đặt iPhone -> Thông báo -> Lexilo để bật."
        );
      } else {
        onNotice("error", "Chưa cấp quyền thông báo.");
      }
    }
  }

  async function handleTestNotification() {
    setTesting(true);
    try {
      const sent = await sendNotification(
        "Kiểm tra thông báo Lexilo! 🔔",
        `Hệ thống hoạt động tốt. Hiện bạn đang có ${dueCount} thẻ từ vựng cần ôn.`
      );
      if (sent) {
        onNotice("success", "Đã gửi thông báo thử nghiệm! Kiểm tra màn hình khóa hoặc thanh thông báo.");
      } else {
        onNotice("error", "Không thể gửi thông báo. Hãy kiểm tra cài đặt thông báo của thiết bị.");
      }
    } catch {
      onNotice("error", "Lỗi gửi thông báo thử.");
    } finally {
      setTesting(false);
    }
  }

  function handleTimeChange(timeStr: string) {
    setSelectedTime(timeStr);
    setReminderTime(timeStr);
    onNotice("success", `Đã đặt giờ nhắc nhở mỗi ngày vào ${timeStr}.`);
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
                Thông báo nhắc ôn tập
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Nhắc nhở khi có từ vựng đến hạn ôn tập FSRS
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Status Badge */}
          {status === "granted" && enabled ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 sm:p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    Đã bật thông báo trên thiết bị này
                  </p>
                </div>
                <BellCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                Lexilo sẽ tự động gửi thông báo ra màn hình khóa khi có từ vựng cần ôn tập.
              </p>
            </div>
          ) : status === "denied" ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 sm:p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20">
              <div className="flex items-center gap-2">
                <BellOff className="w-4 h-4 text-rose-600 shrink-0" />
                <p className="text-xs font-bold text-rose-950 dark:text-rose-200">
                  Quyền thông báo đang bị tắt
                </p>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                Để nhận thông báo trên iPhone: Mở <strong>Cài đặt iPhone</strong> →{" "}
                <strong>Thông báo</strong> → chọn <strong>Lexilo</strong> → bật{" "}
                <strong>Cho phép thông báo</strong>.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 sm:p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  Chưa bật thông báo
                </p>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1">
                Bật thông báo để không bao giờ bỏ lỡ chuỗi ngày ôn tập và ghi nhớ từ vựng lâu dài.
              </p>
            </div>
          )}

          {/* Action button if not granted */}
          {status !== "granted" && (
            <Button
              onClick={handleRequestPermission}
              className="w-full bg-[#ff6b4a] hover:bg-[#e85a39] text-white font-bold text-xs sm:text-sm h-11 rounded-xl gap-2 shadow-sm"
            >
              <Bell className="w-4 h-4" /> Bật thông báo ngay
            </Button>
          )}

          {/* Reminder Time Selection */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              Khung giờ nhắc nhở mỗi ngày
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REMINDER_OPTIONS.map((opt) => {
                const isSelected = selectedTime === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTimeChange(opt.value)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition text-left ${
                      isSelected
                        ? "border-[#ff6b4a] bg-orange-50/70 text-[#ff6b4a] dark:bg-orange-950/30 font-bold"
                        : "border-border bg-card text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#ff6b4a] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Notification Button (When Granted) */}
          {status === "granted" && (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={testing}
                className="w-full text-xs h-10 rounded-xl gap-2"
              >
                <Send className="w-3.5 h-3.5 text-[#ff6b4a]" />
                {testing ? "Đang gửi..." : "Gửi thử 1 thông báo để kiểm tra chuông"}
              </Button>
            </div>
          )}

          {/* Tips for iOS */}
          <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              Mẹo thông báo trên iPhone:
            </p>
            <p>• Thông báo sẽ hiện trên Màn hình khóa (Lock Screen), kèm âm thanh và biểu ngữ.</p>
            <p>• Biểu tượng Lexilo ngoài màn hình chính cũng sẽ hiện chấm đỏ số lượng từ cần học.</p>
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
