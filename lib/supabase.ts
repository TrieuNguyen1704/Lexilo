import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { Store } from "./lexilo";

const STORAGE_SUPABASE_URL_KEY = "lexilo_supabase_url";
const STORAGE_SUPABASE_KEY_KEY = "lexilo_supabase_anon_key";
const LAST_SYNCED_KEY = "lexilo_last_synced_at";

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (typeof window !== "undefined") {
    const customUrl = window.localStorage.getItem(STORAGE_SUPABASE_URL_KEY);
    const customKey = window.localStorage.getItem(STORAGE_SUPABASE_KEY_KEY);
    return {
      url: customUrl || envUrl,
      anonKey: customKey || envKey,
    };
  }

  return { url: envUrl, anonKey: envKey };
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== "undefined") {
    if (url.trim()) {
      window.localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
    } else {
      window.localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
    }

    if (anonKey.trim()) {
      window.localStorage.setItem(STORAGE_SUPABASE_KEY_KEY, anonKey.trim());
    } else {
      window.localStorage.removeItem(STORAGE_SUPABASE_KEY_KEY);
    }
    cachedClient = null;
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error("Failed to initialize Supabase client", err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey);
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export function getLastSyncedTime(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_SYNCED_KEY);
}

export function setLastSyncedTime(timeStr?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SYNCED_KEY, timeStr || new Date().toISOString());
}

// Push local store to Supabase cloud
export async function pushStoreToCloud(store: Store): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase" };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Chưa đăng nhập" };

    const payload = {
      user_id: user.id,
      store_data: store,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("user_sync_store")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      return { success: false, error: error.message };
    }

    setLastSyncedTime();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi đồng bộ dữ liệu" };
  }
}

// Pull store from Supabase cloud
export async function pullStoreFromCloud(): Promise<{ store: Store | null; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { store: null, error: "Chưa cấu hình Supabase" };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { store: null, error: "Chưa đăng nhập" };

    const { data, error } = await supabase
      .from("user_sync_store")
      .select("store_data, updated_at")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // Row not found means first time user
      if (error.code === "PGRST116") {
        return { store: null };
      }
      return { store: null, error: error.message };
    }

    if (data?.store_data && Array.isArray(data.store_data.decks)) {
      setLastSyncedTime(data.updated_at);
      return { store: data.store_data as Store };
    }

    return { store: null };
  } catch (err: any) {
    return { store: null, error: err?.message || "Lỗi tải dữ liệu từ đám mây" };
  }
}
