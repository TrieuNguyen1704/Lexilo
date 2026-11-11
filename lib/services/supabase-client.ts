import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { DEFAULT_SUPABASE_CONFIG, STORAGE_KEYS } from "@/lib/config/constants";

function sanitizeUrl(raw: string): string {
  return raw.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_CONFIG.URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_CONFIG.ANON_KEY;

  if (typeof window !== "undefined") {
    const customUrl = window.localStorage.getItem(STORAGE_KEYS.SUPABASE_URL);
    const customKey = window.localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
    return {
      url: sanitizeUrl(customUrl || envUrl),
      anonKey: (customKey || envKey).trim(),
    };
  }

  return { url: sanitizeUrl(envUrl), anonKey: envKey.trim() };
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window === "undefined") return;

  const cleanedUrl = sanitizeUrl(url);
  const cleanedKey = anonKey.trim();

  if (cleanedUrl) {
    window.localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanedUrl);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
  }

  if (cleanedKey) {
    window.localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, cleanedKey);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
  }

  cachedClient = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  try {
    cachedClient = createClient(sanitizeUrl(url), anonKey, {
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

export async function getCurrentCloudUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
