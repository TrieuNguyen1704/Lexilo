"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudCheck,
  CloudOff,
  Database,
  ExternalLink,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
      onNotice("error", "Vui lòng nhập cả Supabase URL và Anon Public Key.");
      return;
    }
    saveCustomSupabaseCredentials(urlInput.trim(), keyInput.trim());
    setConfigured(true);
    setShowConfig(false);
    onNotice("success", "Đã lưu thông tin cấu hình Supabase!");
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
      onNotice("error", "Chưa cấu hình Supabase.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      onNotice("error", "Vui lòng nhập email và mật khẩu.");
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
          onNotice("success", "Đăng ký thành công! Đang tự động đồng bộ thẻ...");
          // Initial push
          await pushStoreToCloud(currentStore);
          setLastSync(new Date().toISOString());
        } else {
          onNotice("success", "Đã gửi email xác nhận. Vui lòng kiểm tra hòm thư của bạn.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.user) {
          setUser({ email: data.user.email, id: data.user.id });
          onNotice("success", "Đăng nhập thành công! Đang tải dữ liệu từ đám mây...");
          // Pull cloud store
          const { store: cloudStore } = await pullStoreFromCloud();
          if (cloudStore && cloudStore.decks.length > 0) {
            onStoreUpdated(cloudStore);
            onNotice("success", "Đã đồng bộ toàn bộ bộ thẻ từ tài khoản đám mây!");
          } else {
            // First time login with no data, push current local store
            await pushStoreToCloud(currentStore);
            onNotice("success", "Đã tải bộ thẻ hiện tại của bạn lên đám mây!");
          }
          setLastSync(new Date().toISOString());
        }
      }
    } catch (err: any) {
      onNotice("error", err?.message || "Đăng nhập/Đăng ký thất bại");
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
    onNotice("success", "Đã đăng xuất khỏi tài khoản đám mây.");
  }

  async function handleManualSync() {
    setSyncBusy(true);
    try {
      // 1. Pull latest from cloud first
      const { store: cloudStore, error } = await pullStoreFromCloud();
      if (error) throw new Error(error);

      if (cloudStore && cloudStore.decks.length > 0) {
        onStoreUpdated(cloudStore);
        setLastSync(new Date().toISOString());
        onNotice("success", "Đã cập nhật dữ liệu mới nhất từ đám mây!");
      } else {
        // Push local store
        const pushRes = await pushStoreToCloud(currentStore);
        if (pushRes.error) throw new Error(pushRes.error);
        setLastSync(new Date().toISOString());
        onNotice("success", "Đã tải dữ liệu lên đám mây thành công!");
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
      onNotice("success", "Đã đẩy toàn bộ thẻ trên máy này lên đám mây!");
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
      return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " (" + d.toLocaleDateString("vi-VN") + ")";
    } catch {
      return timeStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#ff6b4a] dark:bg-orange-950/50 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Đồng bộ đám mây (Cloud Sync)</DialogTitle>
              <DialogDescription className="text-xs">
                Tự động đồng bộ thẻ từ giữa Máy tính, iPhone và Máy tính bảng
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* NOT CONFIGURED OR EDIT CONFIG */}
        {(!configured || showConfig) ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-600" /> Kết nối cơ sở dữ liệu Supabase (Miễn phí)
              </p>
              <p>
                Để đồng bộ qua mạng, ứng dụng cần kết nối với 1 tài khoản Supabase miễn phí. Tạo dự án tại{" "}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-amber-700 dark:text-amber-300 inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink className="w-3 h-3" />
                </a>{" "}
                rồi dán URL và Key vào bên dưới:
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Project URL
                </label>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://xyzabcdefg.supabase.co"
                  className="text-xs font-mono h-9"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Anon Public Key
                </label>
                <Input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  className="text-xs font-mono h-9"
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
              <p className="font-semibold mb-1 text-foreground">💡 Lưu ý quan trọng:</p>
              <p>
                Sau khi tạo Project trên Supabase, hãy vào mục <strong>SQL Editor</strong> và chạy lệnh tạo bảng:
              </p>
              <code className="block mt-1.5 p-2 bg-background border rounded text-[10px] select-all overflow-x-auto whitespace-pre">
{`create table if not exists public.user_sync_store (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_sync_store enable row level security;
create policy "Read own" on public.user_sync_store for select using (auth.uid() = user_id);
create policy "Insert own" on public.user_sync_store for insert with check (auth.uid() = user_id);
create policy "Update own" on public.user_sync_store for update using (auth.uid() = user_id);`}
              </code>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {configured && (
                <Button variant="ghost" size="sm" onClick={() => setShowConfig(false)}>
                  Quay lại
                </Button>
              )}
              <Button size="sm" onClick={handleSaveConfig} className="bg-[#ff6b4a] hover:bg-[#e85a39] text-white">
                Lưu cấu hình
              </Button>
            </div>
          </div>
        ) : user ? (
          /* LOGGED IN USER */
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                    {user.email ? user.email.slice(0, 2).toUpperCase() : "US"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">{user.email}</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Đã kết nối đám mây
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-500"
                  onClick={handleSignOut}
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-3 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-900/30 text-[11px] text-muted-foreground flex justify-between items-center">
                <span>Lần đồng bộ gần nhất:</span>
                <span className="font-medium text-foreground">{formatLastSync(lastSync)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full text-xs h-9 gap-1.5"
                onClick={handleManualSync}
                disabled={syncBusy}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncBusy ? "animate-spin text-[#ff6b4a]" : ""}`} />
                {syncBusy ? "Đang đồng bộ..." : "Đồng bộ từ đám mây"}
              </Button>
              <Button
                className="w-full text-xs h-9 gap-1.5 bg-[#ff6b4a] hover:bg-[#e85a39] text-white"
                onClick={handlePushLocalToCloud}
                disabled={syncBusy}
              >
                <Cloud className="w-3.5 h-3.5" />
                {syncBusy ? "Đang tải lên..." : "Đẩy máy này lên mây"}
              </Button>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Tính năng tự động đồng bộ:
              </p>
              <p>• Bất kỳ khi nào anh thêm thẻ, sửa thẻ hay ôn tập thẻ, Lexilo sẽ tự động lưu lên đám mây.</p>
              <p>• Khi anh mở iPhone lên, ứng dụng sẽ tự động tải các cập nhật mới nhất về.</p>
              <p>• Bạn gái anh dùng tài khoản riêng thì hoàn toàn độc lập, không xem được thẻ của nhau.</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] text-muted-foreground h-7 px-2"
                onClick={() => setShowConfig(true)}
              >
                <Settings2 className="w-3.5 h-3.5 mr-1" /> Đổi cấu hình Supabase
              </Button>
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-8">
                Đóng
              </Button>
            </div>
          </div>
        ) : (
          /* AUTH FORM (SIGN IN / SIGN UP) */
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-200">
              <p className="font-semibold mb-0.5">Tài khoản cá nhân của bạn</p>
              <p>
                Đăng nhập để tự động đồng bộ thẻ giữa PC & iPhone. Bạn gái của bạn có thể đăng ký tài khoản riêng để sử dụng hoàn toàn độc lập.
              </p>
            </div>

            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
                <TabsTrigger value="signup">Đăng ký mới</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trieu@example.com"
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-8 text-xs h-9"
                      onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    />
                  </div>
                </div>
                <Button
                  className="w-full mt-2 bg-[#ff6b4a] hover:bg-[#e85a39] text-white text-xs h-9"
                  onClick={handleAuth}
                  disabled={busy}
                >
                  {busy ? "Đang xử lý..." : "Đăng nhập & Bắt đầu đồng bộ"}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Email của bạn</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trieu@example.com"
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Tạo mật khẩu</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="pl-8 text-xs h-9"
                      onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                    />
                  </div>
                </div>
                <Button
                  className="w-full mt-2 bg-[#ff6b4a] hover:bg-[#e85a39] text-white text-xs h-9"
                  onClick={handleAuth}
                  disabled={busy}
                >
                  {busy ? "Đang tạo tài khoản..." : "Đăng ký tài khoản miễn phí"}
                </Button>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] text-muted-foreground h-7 px-2"
                onClick={() => setShowConfig(true)}
              >
                <Settings2 className="w-3.5 h-3.5 mr-1" /> Cấu hình Supabase
              </Button>
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-8">
                Hủy
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
