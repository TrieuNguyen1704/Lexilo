"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  Database,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Settings2,
  ShieldCheck,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCurrentUser,
  getLastSyncedTime,
  getSupabase,
  getSupabaseCredentials,
  isSupabaseConfigured,
  pullStoreFromCloud,
  pushStoreToCloud,
  saveCustomSupabaseCredentials,
  setLastSyncedTime,
} from "@/lib/supabase";
import { Store } from "@/lib/lexilo";

interface CloudSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStore: Store;
  onStoreUpdated: (newStore: Store) => void;
  onNotice: (kind: "success" | "error", text: string) => void;
}

export function CloudSyncDialog({
  open,
  onOpenChange,
  currentStore,
  onStoreUpdated,
  onNotice,
}: CloudSyncDialogProps) {
  const [configured, setConfigured] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [keyInput, setKeyInput] = useState("");

  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const isConfig = isSupabaseConfigured();
    setConfigured(isConfig);
    const creds = getSupabaseCredentials();
    setUrlInput(creds.url);
    setKeyInput(creds.anonKey);
    setLastSync(getLastSyncedTime());

    if (isConfig) {
      getCurrentUser().then((u) => {
        setUser(u ? { email: u.email, id: u.id } : null);
      });
    }
  }, [open]);

  function handleSaveConfig() {
    if (!urlInput.trim() || !keyInput.trim()) {
      onNotice("error", "Vui lòng nhập đầy đủ Project URL và API Key.");
      return;
    }
    saveCustomSupabaseCredentials(urlInput.trim(), keyInput.trim());
    setConfigured(true);
    setShowConfig(false);
    onNotice("success", "Đã lưu cấu hình đám mây!");
    const supabase = getSupabase();
    if (supabase) {
      getCurrentUser().then((u) => {
        setUser(u ? { email: u.email, id: u.id } : null);
      });
    }
  }

  async function handleAuth() {
    const supabase = getSupabase();
    if (!supabase) {
      onNotice("error", "Chưa kết nối cơ sở dữ liệu.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      onNotice("error", "Vui lòng điền email và mật khẩu.");
      return;
    }

    setBusy(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.user) {
          setUser({ email: data.user.email, id: data.user.id });
          onNotice("success", "Đăng ký thành công!");
          await pushStoreToCloud(currentStore);
          setLastSync(new Date().toISOString());
        } else {
          onNotice("success", "Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.user) {
          setUser({ email: data.user.email, id: data.user.id });
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
      }
    } catch (err: any) {
      let msg = err?.message || "Thao tác thất bại";
      if (msg.toLowerCase().includes("email not confirmed")) {
        msg = "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư hoặc tắt 'Confirm Email' trong Supabase.";
      } else if (msg.toLowerCase().includes("invalid login credentials")) {
        msg = "Email hoặc mật khẩu không chính xác.";
      }
      onNotice("error", msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
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
    } catch (err: any) {
      onNotice("error", err?.message || "Lỗi đồng bộ");
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
    } catch (err: any) {
      onNotice("error", err?.message || "Lỗi tải lên");
    } finally {
      setSyncBusy(false);
    }
  }

  const formatLastSync = (timeStr: string | null) => {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#ff6b4a] dark:bg-orange-950/50 flex items-center justify-center font-bold shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Đồng bộ đám mây
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tự động đồng bộ giữa các thiết bị
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 1. CONFIGURATION VIEW */}
        {(!configured || showConfig) ? (
          <div className="space-y-4 py-1">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Project URL
                </label>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="text-xs sm:text-sm font-mono h-10 w-full rounded-xl"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  API Key (Anon / Publishable Key)
                </label>
                <Input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sb_publishable_... hoặc eyJhbGciOi..."
                  className="text-xs sm:text-sm font-mono h-10 w-full rounded-xl"
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
                  className="text-xs h-9 rounded-xl"
                >
                  Quay lại
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSaveConfig}
                className="bg-[#ff6b4a] hover:bg-[#e85a39] text-white text-xs font-bold h-9 px-4 rounded-xl"
              >
                Lưu cấu hình
              </Button>
            </div>
          </div>
        ) : user ? (
          /* 2. LOGGED IN VIEW */
          <div className="space-y-4 py-1">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 sm:p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {user.email ? user.email.slice(0, 2).toUpperCase() : "US"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200 truncate">
                      {user.email}
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Đang đồng bộ
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                  onClick={handleSignOut}
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/30 text-[11px] text-muted-foreground flex justify-between items-center">
                <span>Lần đồng bộ gần nhất:</span>
                <span className="font-medium text-foreground">{formatLastSync(lastSync)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full text-xs h-9 rounded-xl gap-1.5"
                onClick={handleManualSync}
                disabled={syncBusy}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncBusy ? "animate-spin text-[#ff6b4a]" : ""}`} />
                {syncBusy ? "Đang tải..." : "Tải từ đám mây"}
              </Button>
              <Button
                className="w-full text-xs h-9 rounded-xl gap-1.5 bg-[#ff6b4a] hover:bg-[#e85a39] text-white font-medium"
                onClick={handlePushLocalToCloud}
                disabled={syncBusy}
              >
                <Cloud className="w-3.5 h-3.5" />
                {syncBusy ? "Đang lưu..." : "Đẩy lên đám mây"}
              </Button>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] text-muted-foreground h-8 px-2 rounded-lg"
                onClick={() => setShowConfig(true)}
              >
                <Settings2 className="w-3.5 h-3.5 mr-1" /> Cấu hình lại
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8 rounded-lg"
              >
                Đóng
              </Button>
            </div>
          </div>
        ) : (
          /* 3. AUTH VIEW (SIGN IN / SIGN UP) */
          <div className="space-y-4 py-1">
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl">
                <TabsTrigger value="signin" className="text-xs">Đăng nhập</TabsTrigger>
                <TabsTrigger value="signup" className="text-xs">Đăng ký mới</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-3 pt-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="pl-9 text-xs sm:text-sm h-10 w-full rounded-xl"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 text-xs sm:text-sm h-10 w-full rounded-xl"
                      onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    />
                  </div>
                </div>
                <Button
                  className="w-full mt-2 bg-[#ff6b4a] hover:bg-[#e85a39] text-white text-xs sm:text-sm font-bold h-10 rounded-xl"
                  onClick={handleAuth}
                  disabled={busy}
                >
                  {busy ? "Đang xử lý..." : "Đăng nhập & Đồng bộ"}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 pt-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="pl-9 text-xs sm:text-sm h-10 w-full rounded-xl"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="pl-9 text-xs sm:text-sm h-10 w-full rounded-xl"
                      onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    />
                  </div>
                </div>
                <Button
                  className="w-full mt-2 bg-[#ff6b4a] hover:bg-[#e85a39] text-white text-xs sm:text-sm font-bold h-10 rounded-xl"
                  onClick={handleAuth}
                  disabled={busy}
                >
                  {busy ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] text-muted-foreground h-8 px-2 rounded-lg"
                onClick={() => setShowConfig(true)}
              >
                <Settings2 className="w-3.5 h-3.5 mr-1" /> Cấu hình lại
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8 rounded-lg"
              >
                Đóng
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
