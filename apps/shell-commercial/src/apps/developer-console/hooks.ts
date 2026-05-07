/**
 * Super Sprint F — Hooks compartilhados do Developer Console.
 */

import { useCallback, useEffect, useState } from "react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import type { DeveloperAccount, AppSubmission, AppReview } from "./types";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDeveloperAccount(): FetchState<DeveloperAccount> {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const [data, setData] = useState<DeveloperAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (drivers === null || userId === null) return;
    setLoading(true);
    setError(null);
    try {
      const { data: row, error: err } = await drivers.data
        .from("developer_accounts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (err !== null && err !== undefined) {
        setError(
          typeof err === "object" && "message" in err
            ? String(err.message)
            : "Falha ao carregar",
        );
      } else {
        setData((row as DeveloperAccount | null) ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [drivers, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useDeveloperApps(
  developerId: string | null,
): FetchState<AppSubmission[]> {
  const drivers = useDrivers();
  const [data, setData] = useState<AppSubmission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (drivers === null || developerId === null) return;
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await drivers.data
        .from("app_submissions")
        .select("*")
        .eq("developer_id", developerId)
        .order("updated_at", { ascending: false });
      if (err !== null && err !== undefined) {
        setError(
          typeof err === "object" && "message" in err
            ? String(err.message)
            : "Falha ao carregar",
        );
      } else {
        setData((rows ?? []) as AppSubmission[]);
      }
    } finally {
      setLoading(false);
    }
  }, [drivers, developerId]);

  useEffect(() => {
    if (developerId === null) {
      setLoading(false);
      return;
    }
    void refresh();
    if (drivers === null) return;
    const sub = drivers.data.subscribeToTable({
      table: "app_submissions",
      event: "*",
      filter: `developer_id=eq.${developerId}`,
      onData: () => void refresh(),
    });
    return () => sub.unsubscribe();
  }, [drivers, developerId, refresh]);

  return { data, loading, error, refresh };
}

export function useAppInstallationCount(appSlug: string): {
  total: number;
  thisMonth: number;
  loading: boolean;
} {
  const drivers = useDrivers();
  const [total, setTotal] = useState(0);
  const [thisMonth, setThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (drivers === null || appSlug === "") return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { count: totalCount } = await drivers.data
        .from("app_installations")
        .select("*", { count: "exact", head: true })
        .eq("app_slug", appSlug)
        .is("uninstalled_at", null);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count: monthCount } = await drivers.data
        .from("app_installations")
        .select("*", { count: "exact", head: true })
        .eq("app_slug", appSlug)
        .gte("installed_at", monthStart.toISOString());
      if (!cancelled) {
        setTotal(totalCount ?? 0);
        setThisMonth(monthCount ?? 0);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, appSlug]);

  return { total, thisMonth, loading };
}

export function useAppReviews(
  submissionId: string | null,
): FetchState<AppReview[]> {
  const drivers = useDrivers();
  const [data, setData] = useState<AppReview[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (drivers === null || submissionId === null) return;
    setLoading(true);
    const { data: rows, error: err } = await drivers.data
      .from("app_reviews")
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false });
    if (err !== null && err !== undefined) {
      setError(
        typeof err === "object" && "message" in err
          ? String(err.message)
          : "Falha",
      );
    } else {
      setData((rows ?? []) as AppReview[]);
    }
    setLoading(false);
  }, [drivers, submissionId]);

  useEffect(() => {
    if (submissionId === null) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [submissionId, refresh]);

  return { data, loading, error, refresh };
}

export function useInstallationsByDeveloper(appSlugs: string[]): {
  byApp: Record<string, { total: number; month: number }>;
  loading: boolean;
} {
  const drivers = useDrivers();
  const [byApp, setByApp] = useState<
    Record<string, { total: number; month: number }>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (drivers === null || appSlugs.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const out: Record<string, { total: number; month: number }> = {};
      for (const slug of appSlugs) {
        const { count: total } = await drivers.data
          .from("app_installations")
          .select("*", { count: "exact", head: true })
          .eq("app_slug", slug)
          .is("uninstalled_at", null);
        const { count: month } = await drivers.data
          .from("app_installations")
          .select("*", { count: "exact", head: true })
          .eq("app_slug", slug)
          .gte("installed_at", monthStart.toISOString());
        out[slug] = { total: total ?? 0, month: month ?? 0 };
      }
      if (!cancelled) {
        setByApp(out);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drivers, appSlugs.join(",")]);

  return { byApp, loading };
}
