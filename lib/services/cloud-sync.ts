import { STORAGE_KEYS } from "@/lib/config/constants";
import type { CloudUser, Store } from "@/types/lexilo";
import { getSupabaseClient } from "./supabase-client";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function translateAuthError(error: unknown): string {
  const raw = getErrorMessage(error, "Thao tác thất bại");
  const lower = raw.toLowerCase();

  if (lower.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư hoặc tắt 'Confirm Email' trong Supabase.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không chính xác.";
  }
  return raw;
}

export function getLastSyncedTime(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEYS.LAST_SYNCED_AT);
}

export function setLastSyncedTime(timeStr?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.LAST_SYNCED_AT, timeStr || new Date().toISOString());
}

export async function pushStoreToCloud(
  store: Store,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase" };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Chưa đăng nhập" };

    const { error } = await supabase.from("user_sync_store").upsert(
      {
        user_id: user.id,
        store_data: store,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      return { success: false, error: error.message };
    }

    setLastSyncedTime();
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Lỗi đồng bộ dữ liệu") };
  }
}

export async function pullStoreFromCloud(): Promise<{ store: Store | null; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { store: null, error: "Chưa cấu hình Supabase" };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { store: null, error: "Chưa đăng nhập" };

    const { data, error } = await supabase
      .from("user_sync_store")
      .select("store_data, updated_at")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { store: null };
      }
      return { store: null, error: error.message };
    }

    const row = data as { store_data?: Store; updated_at?: string } | null;
    if (row?.store_data && Array.isArray(row.store_data.decks)) {
      setLastSyncedTime(row.updated_at);
      return { store: row.store_data };
    }

    return { store: null };
  } catch (error) {
    return { store: null, error: getErrorMessage(error, "Lỗi tải dữ liệu từ đám mây") };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ user: CloudUser | null; needsConfirmation: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Chưa kết nối cơ sở dữ liệu.");

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: password.trim(),
  });
  if (error) throw new Error(translateAuthError(error));

  if (data.user) {
    return {
      user: { id: data.user.id, email: data.user.email },
      needsConfirmation: !data.session,
    };
  }
  return { user: null, needsConfirmation: true };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<CloudUser> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Chưa kết nối cơ sở dữ liệu.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });
  if (error) throw new Error(translateAuthError(error));
  if (!data.user) throw new Error("Không thể xác thực tài khoản.");

  return { id: data.user.id, email: data.user.email };
}

export async function signOutFromCloud(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
