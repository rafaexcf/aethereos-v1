import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrivers } from "../lib/drivers-context";
import { useSessionStore } from "../stores/session";
import type { CloudDrivers } from "../lib/drivers";

export type UserPreferenceKey =
  | "dock_order"
  | "theme"
  | "notification_prefs"
  | "dock_hidden"
  | "lock_timeout_minutes"
  | "llm_config";

interface UserPreferenceRow {
  value: unknown;
  updated_at: string;
}

interface UseUserPreferenceResult<T> {
  value: T;
  set: (next: T) => void;
  isLoading: boolean;
}

const CACHE_PREFIX = "ae-user-pref:";
const DEBOUNCE_MS = 400;

function cacheKey(key: UserPreferenceKey, userId: string | null): string {
  return userId === null
    ? `${CACHE_PREFIX}anon:${key}`
    : `${CACHE_PREFIX}${userId}:${key}`;
}

function readCache<T>(key: UserPreferenceKey, userId: string | null): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(key, userId));
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeCache<T>(
  key: UserPreferenceKey,
  userId: string | null,
  value: T,
): void {
  try {
    localStorage.setItem(cacheKey(key, userId), JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

async function fetchRemote(
  drivers: CloudDrivers,
  userId: string,
  key: UserPreferenceKey,
): Promise<UserPreferenceRow | null> {
  try {
    const { data, error } = (await drivers.data
      .from("user_preferences")
      .select("value,updated_at")
      .eq("user_id", userId)
      .eq("key", key)
      .maybeSingle()) as {
      data: UserPreferenceRow | null;
      error: unknown;
    };
    if (error !== null && error !== undefined) return null;
    return data;
  } catch {
    return null;
  }
}

async function upsertRemote(
  drivers: CloudDrivers,
  userId: string,
  key: UserPreferenceKey,
  value: unknown,
): Promise<void> {
  try {
    await drivers.data.from("user_preferences").upsert(
      {
        user_id: userId,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" },
    );
  } catch {
    /* network — next change retries */
  }
}

export function useUserPreference<T>(
  key: UserPreferenceKey,
  defaultValue: T,
): UseUserPreferenceResult<T> {
  const ctxDrivers = useDrivers();
  const sessionDrivers = useSessionStore((s) => s.drivers);
  const drivers = ctxDrivers ?? sessionDrivers;
  const userId = useSessionStore((s) => s.userId);

  const initial = useMemo<T>(() => {
    const cached = readCache<T>(key, userId);
    return cached !== null ? cached : defaultValue;
  }, [key, userId, defaultValue]);

  const [value, setValue] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localUpdatedAtRef = useRef<number>(0);

  useEffect(() => {
    if (drivers === null || userId === null) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const row = await fetchRemote(drivers, userId, key);
      if (cancelled) return;
      if (row !== null) {
        const remoteTs = new Date(row.updated_at).getTime();
        if (remoteTs >= localUpdatedAtRef.current) {
          const remoteValue = row.value as T;
          setValue(remoteValue);
          writeCache<T>(key, userId, remoteValue);
        }
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, userId, key]);

  useEffect(() => {
    if (drivers === null || userId === null) return;
    const sub = drivers.data.subscribeToTable({
      table: "user_preferences",
      event: "*",
      filter: `user_id=eq.${userId}`,
      onData: (payload) => {
        const row = payload.new as Partial<UserPreferenceRow> & {
          key?: string;
        };
        if (row === undefined || row === null) return;
        if (row.key !== key) return;
        const updatedAtRaw = row.updated_at;
        if (typeof updatedAtRaw !== "string") return;
        const remoteTs = new Date(updatedAtRaw).getTime();
        if (remoteTs <= localUpdatedAtRef.current) return;
        const nextValue = row.value as T;
        setValue(nextValue);
        writeCache<T>(key, userId, nextValue);
      },
    });
    return () => {
      sub.unsubscribe();
    };
  }, [drivers, userId, key]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeCache<T>(key, userId, next);
      localUpdatedAtRef.current = Date.now();
      if (drivers === null || userId === null) return;
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void upsertRemote(drivers, userId, key, next);
      }, DEBOUNCE_MS);
    },
    [drivers, userId, key],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  return { value, set, isLoading };
}
