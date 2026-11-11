"use client";

import { useCallback, useEffect, useState } from "react";
import { pullStoreFromCloud, pushStoreToCloud } from "@/lib/services/cloud-sync";
import { getCurrentCloudUser } from "@/lib/services/supabase-client";
import type { CloudUser, Store } from "@/types/lexilo";

async function fetchCloudStateSnapshot(): Promise<{
  user: CloudUser | null;
  store: Store | null;
}> {
  try {
    const user = await getCurrentCloudUser();
    if (!user) return { user: null, store: null };

    const { store } = await pullStoreFromCloud();
    const validStore =
      store && Array.isArray(store.decks) && store.decks.length > 0 ? store : null;

    return {
      user: { email: user.email, id: user.id },
      store: validStore,
    };
  } catch {
    return { user: null, store: null };
  }
}

export function useCloudSync(onCloudStoreLoaded: (store: Store) => void) {
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runSync = () => {
      void fetchCloudStateSnapshot().then(({ user, store }) => {
        if (cancelled) return;
        setCloudUser(user);
        if (store) {
          onCloudStoreLoaded(store);
        }
      });
    };

    runSync();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runSync();
      }
    };

    window.addEventListener("focus", runSync);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", runSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onCloudStoreLoaded]);

  const pushIfAuthenticated = useCallback(
    (store: Store) => {
      if (cloudUser) {
        pushStoreToCloud(store).catch(() => {});
      }
    },
    [cloudUser],
  );

  const refreshCloudUser = useCallback(async () => {
    const user = await getCurrentCloudUser();
    setCloudUser(user ? { email: user.email, id: user.id } : null);
  }, []);

  return {
    cloudUser,
    pushIfAuthenticated,
    refreshCloudUser,
  };
}
