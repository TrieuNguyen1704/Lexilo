"use client";

import { useEffect, useState } from "react";
import { Cloud, Lock, LogOut, Mail, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getErrorMessage,
  getLastSyncedTime,
  pullStoreFromCloud,
  pushStoreToCloud,
  signInWithEmail,
  signOutFromCloud,
  signUpWithEmail,
} from "@/lib/services/cloud-sync";
import {
  getCurrentCloudUser,
  getSupabaseClient,
  getSupabaseCredentials,
  isSupabaseConfigured,
  saveCustomSupabaseCredentials,
} from "@/lib/services/supabase-client";
import type { CloudUser, Notice, Store } from "@/types/lexilo";

interface CloudSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStore: Store;
  onStoreUpdated: (newStore: Store) => void;
  onAuthChanged?: () => void;
  onNotice: (kind: Notice["kind"], text: string) => void;
}

function formatLastSync(timeStr: string | null): string {
  if (!timeStr) return "Chưa đồng bộ";
  try {
    const d = new Date(timeStr);
    return (
      d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
      " " +
      d.toLocaleDateString("vi-VN")
    );
  } catch {
    return timeStr;
  }
}

export function CloudSyncDialog(props: CloudSyncDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="clay-card max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-[28px] p-5 sm:p-6">
        <DialogHeader className="pb-2 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-[#6d28d9] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.85)]">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900">
                Đồng bộ đám mây
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-600">
                Tự động đồng bộ giữa các thiết bị
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {props.open && <CloudSyncBody {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function CloudSyncBody({
  onOpenChange,
  currentStore,
  onStoreUpdated,
  onAuthChanged,
  onNotice,
}: CloudSyncDialogProps) {
  const initialCreds = getSupabaseCredentials();
  const [configured, setConfigured] = useState(() => isSupabaseConfigured());
  const [showConfig, setShowConfig] = useState(false);
  const [urlInput, setUrlInput] = useState(initialCreds.url);
  const [keyInput, setKeyInput] = useState(initialCreds.anonKey);

  const [user, setUser] = useState<CloudUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => getLastSyncedTime());

  useEffect(() => {
    if (!configured) return;
    let active = true;
    getCurrentCloudUser().then((u) => {
      if (active) setUser(u ? { email: u.email, id: u.id } : null);
    });
    return () => {
      active = false;
    };
  }, [configured]);

  function handleSaveConfig() {
    if (!urlInput.trim() || !keyInput.trim()) {
      onNotice("error", "Vui lòng nhập đầy đủ Project URL và API Key.");
      return;
    }
    saveCustomSupabaseCredentials(urlInput.trim(), keyInput.trim());
    setConfigured(true);
    setShowConfig(false);
    onNotice("success", "Đã lưu cấu hình đám mây!");
    if (getSupabaseClient()) {
      getCurrentCloudUser().then((u) => {
        setUser(u ? { email: u.email, id: u.id } : null);
      });
    }
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      onNotice("error", "Vui lòng điền email và mật khẩu.");
      return;
    }

    setBusy(true);
    try {
      if (authMode === "signup") {
        const result = await signUpWithEmail(email, password);
        if (result.user) {
          setUser(result.user);
          onAuthChanged?.();
          onNotice("success", "Đăng ký thành công!");
          await pushStoreToCloud(currentStore);
          setLastSync(new Date().toISOString());
        } else {
          onNotice("success", "Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư.");
        }
      } else {
        const signedInUser = await signInWithEmail(email, password);
        setUser(signedInUser);
        onAuthChanged?.();
        onNotice("success", "Đăng nhập thành công!");
        const { store: cloudStore } = await pullStoreFromCloud();
        if (cloudStore && cloudStore.decks.length > 0) {
          onStoreUpdated(cloudStore);
          onNotice("success", "Đã đồng bộ dữ liệu từ đám mây!");
        } else {
          await pushStoreToCloud(currentStore);
        }
        setLastSync(new Date().toISOString());
      }
    } catch (error) {
      onNotice("error", getErrorMessage(error, "Thao tác thất bại"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOutFromCloud();
    setUser(null);
    onAuthChanged?.();
    onNotice("success", "Đã đăng xuất tài khoản.");
  }

  async function handleManualSync() {
    setSyncBusy(true);
    try {
      const { store: cloudStore, error } = await pullStoreFromCloud();
      if (error) throw new Error(error);

      if (cloudStore && cloudStore.decks.length > 0) {
        onStoreUpdated(cloudStore);
        setLastSync(new Date().toISOString());
        onNotice("success", "Đã cập nhật dữ liệu mới nhất!");
      } else {
        const pushRes = await pushStoreToCloud(currentStore);
        if (pushRes.error) throw new Error(pushRes.error);
        setLastSync(new Date().toISOString());
        onNotice("success", "Đã tải dữ liệu lên đám mây!");
      }
    } catch (error) {
      onNotice("error", getErrorMessage(error, "Lỗi đồng bộ"));
    } finally {
      setSyncBusy(false);
    }
  }

  async function handlePushLocalToCloud() {
    setSyncBusy(true);
    try {
      const res = await pushStoreToCloud(currentStore);
      if (res.error) throw new Error(res.error);
      setLastSync(new Date().toISOString());
      onNotice("success", "Đã đồng bộ thiết bị này lên đám mây!");
    } catch (error) {
      onNotice("error", getErrorMessage(error, "Lỗi tải lên"));
    } finally {
      setSyncBusy(false);
    }
  }

  if (!configured || showConfig) {
    return (
      <div className="space-y-4 py-1">
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Project URL</label>
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              className="h-10 w-full rounded-2xl border-[var(--border)] bg-white font-mono text-xs sm:text-sm"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              API Key (Anon / Publishable Key)
            </label>
            <Input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sb_publishable_... hoặc eyJhbGciOi..."
              className="h-10 w-full rounded-2xl border-[var(--border)] bg-white font-mono text-xs sm:text-sm"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {configured && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(false)}
              className="h-9 rounded-2xl text-xs font-bold"
            >
              Quay lại
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveConfig}
            className="clay-cta h-9 rounded-2xl bg-[#7c3aed] px-4 text-xs font-bold text-white hover:bg-[#6d28d9]"
          >
            Lưu cấu hình
          </Button>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="space-y-4 py-1">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-extrabold text-white">
                {user.email ? user.email.slice(0, 2).toUpperCase() : "US"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-emerald-950 sm:text-sm">
                  {user.email}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                  Đang đồng bộ
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
              onClick={handleSignOut}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-emerald-200/70 pt-2.5 text-[11px] text-slate-600">
            <span>Lần đồng bộ gần nhất:</span>
            <span className="font-bold text-slate-900">{formatLastSync(lastSync)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            className="tap-press h-10 w-full gap-1.5 rounded-2xl border-[var(--border)] bg-white text-xs font-bold"
            onClick={handleManualSync}
            disabled={syncBusy}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncBusy ? "animate-spin text-[#7c3aed]" : ""}`} />
            {syncBusy ? "Đang tải..." : "Tải từ đám mây"}
          </Button>
          <Button
            className="clay-cta h-10 w-full gap-1.5 rounded-2xl bg-[#7c3aed] text-xs font-bold text-white hover:bg-[#6d28d9]"
            onClick={handlePushLocalToCloud}
            disabled={syncBusy}
          >
            <Cloud className="h-3.5 w-3.5" />
            {syncBusy ? "Đang lưu..." : "Đẩy lên đám mây"}
          </Button>
        </div>

        <DialogFooterActions
          onShowConfig={() => setShowConfig(true)}
          onClose={() => onOpenChange(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-1">
      <Tabs
        value={authMode}
        onValueChange={(value) => setAuthMode(value as "signin" | "signup")}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-[#f4eeff] p-1">
          <TabsTrigger value="signin" className="rounded-xl py-1.5 text-xs font-extrabold">
            Đăng nhập
          </TabsTrigger>
          <TabsTrigger value="signup" className="rounded-xl py-1.5 text-xs font-extrabold">
            Đăng ký mới
          </TabsTrigger>
        </TabsList>

        <TabsContent value={authMode} className="space-y-3 pt-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Email</label>
            <div className="relative">
              <Mail className="absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="h-10 w-full rounded-2xl border-[var(--border)] bg-white pl-10 text-xs sm:text-sm"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === "signup" ? "Tối thiểu 6 ký tự" : "••••••••"}
                className="h-10 w-full rounded-2xl border-[var(--border)] bg-white pl-10 text-xs sm:text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              />
            </div>
          </div>

          <Button
            className="clay-cta mt-2 h-11 w-full rounded-2xl bg-[#7c3aed] text-xs font-extrabold text-white hover:bg-[#6d28d9] sm:text-sm"
            onClick={handleAuth}
            disabled={busy}
          >
            {busy
              ? authMode === "signup"
                ? "Đang tạo tài khoản..."
                : "Đang xử lý..."
              : authMode === "signup"
              ? "Tạo tài khoản"
              : "Đăng nhập & Đồng bộ"}
          </Button>
        </TabsContent>
      </Tabs>

      <DialogFooterActions
        onShowConfig={() => setShowConfig(true)}
        onClose={() => onOpenChange(false)}
      />
    </div>
  );
}

function DialogFooterActions({
  onShowConfig,
  onClose,
}: {
  onShowConfig: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 rounded-xl px-2.5 text-xs font-bold text-slate-600"
        onClick={onShowConfig}
      >
        <Settings2 className="mr-1 h-3.5 w-3.5" /> Cấu hình lại
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onClose}
        className="h-9 rounded-xl border-[var(--border)] text-xs font-bold"
      >
        Đóng
      </Button>
    </div>
  );
}
