import { useEffect, useRef } from "react";
import { useDrivers } from "../lib/drivers-context";
import { useSessionStore } from "../stores/session";
import { useOSStore } from "../stores/osStore";
import { useWindowsStore, type AppWindow } from "../stores/windows";
import { getApp } from "../apps/registry";
import type { OSTab } from "../types/os";
import type { CloudDrivers } from "../lib/drivers";

const MESA_TAB_ID = "mesa-tab";
const SAVE_DEBOUNCE_MS = 1000;

interface WorkspaceRow {
  tabs: OSTab[];
  active_tab_id: string | null;
  windows: AppWindow[];
}

function ensureMesaTab(tabs: OSTab[]): OSTab[] {
  const hasMesa = tabs.some((t) => t.id === MESA_TAB_ID);
  if (hasMesa) return tabs;
  const mesaTab: OSTab = {
    id: MESA_TAB_ID,
    appId: "mesa",
    title: "Mesa",
    isActive: false,
    isPinned: true,
  };
  return [mesaTab, ...tabs];
}

function sanitizeTabs(rawTabs: unknown): OSTab[] {
  if (!Array.isArray(rawTabs)) return [];
  const result: OSTab[] = [];
  for (const raw of rawTabs) {
    if (raw === null || typeof raw !== "object") continue;
    const t = raw as Partial<OSTab>;
    if (
      typeof t.id !== "string" ||
      typeof t.appId !== "string" ||
      typeof t.title !== "string"
    ) {
      continue;
    }
    if (getApp(t.appId) === undefined) continue;
    const base: OSTab = {
      id: t.id,
      appId: t.appId,
      title: t.title,
      isActive: t.isActive === true,
      isPinned: t.isPinned === true,
    };
    if (
      typeof t.splitAppId === "string" &&
      getApp(t.splitAppId) !== undefined
    ) {
      base.splitAppId = t.splitAppId;
      if (typeof t.splitTitle === "string") base.splitTitle = t.splitTitle;
      if (typeof t.splitRatio === "number") base.splitRatio = t.splitRatio;
    }
    result.push(base);
  }
  return result;
}

function sanitizeWindows(rawWindows: unknown): AppWindow[] {
  if (!Array.isArray(rawWindows)) return [];
  const result: AppWindow[] = [];
  for (const raw of rawWindows) {
    if (raw === null || typeof raw !== "object") continue;
    const w = raw as Partial<AppWindow>;
    if (
      typeof w.id !== "string" ||
      typeof w.appId !== "string" ||
      typeof w.title !== "string" ||
      typeof w.zIndex !== "number"
    ) {
      continue;
    }
    if (getApp(w.appId) === undefined) continue;
    result.push({
      id: w.id,
      appId: w.appId,
      title: w.title,
      isMinimized: w.isMinimized === true,
      zIndex: w.zIndex,
    });
  }
  return result;
}

function pickActiveTabId(
  tabs: OSTab[],
  rawActive: string | null | undefined,
): string {
  if (typeof rawActive === "string" && tabs.some((t) => t.id === rawActive)) {
    return rawActive;
  }
  return MESA_TAB_ID;
}

async function persistWorkspace(
  drivers: CloudDrivers,
  userId: string,
  companyId: string,
  tabs: OSTab[],
  activeTabId: string,
  windows: AppWindow[],
): Promise<void> {
  await drivers.data.from("workspace_state").upsert(
    {
      user_id: userId,
      company_id: companyId,
      tabs,
      active_tab_id: activeTabId,
      windows,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,company_id" },
  );
}

export function useWorkspacePersistence(): void {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const companyId = useSessionStore((s) => s.activeCompanyId);

  const hydratedRef = useRef(false);
  const hydratedKeyRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFlushRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (drivers === null || userId === null || companyId === null) return;

    const key = `${userId}:${companyId}`;
    if (hydratedKeyRef.current === key) return;

    hydratedRef.current = false;
    hydratedKeyRef.current = key;

    let cancelled = false;

    void (async () => {
      const { data } = await drivers.data
        .from("workspace_state")
        .select("tabs, active_tab_id, windows")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .maybeSingle();

      if (cancelled) return;

      if (data !== null && data !== undefined) {
        const row = data as WorkspaceRow;
        const sanitizedTabs = ensureMesaTab(sanitizeTabs(row.tabs));
        const activeTabId = pickActiveTabId(sanitizedTabs, row.active_tab_id);
        const tabsWithActive = sanitizedTabs.map((t) => ({
          ...t,
          isActive: t.id === activeTabId,
        }));
        const sanitizedWindows = sanitizeWindows(row.windows);
        const maxZ = sanitizedWindows.reduce(
          (acc, w) => (w.zIndex > acc ? w.zIndex : acc),
          200,
        );

        useOSStore.setState({
          tabs: tabsWithActive,
          activeTabId,
        });
        useWindowsStore.setState({
          windows: sanitizedWindows,
          nextZ: maxZ + 1,
        });
      }

      hydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [drivers, userId, companyId]);

  useEffect(() => {
    if (drivers === null || userId === null || companyId === null) return;

    const scheduleSave = (
      tabs: OSTab[],
      activeTabId: string,
      windows: AppWindow[],
    ) => {
      if (!hydratedRef.current) return;
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
      const flush = () => {
        saveTimeoutRef.current = null;
        pendingFlushRef.current = null;
        void persistWorkspace(
          drivers,
          userId,
          companyId,
          tabs,
          activeTabId,
          windows,
        );
      };
      pendingFlushRef.current = flush;
      saveTimeoutRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    };

    const unsubOS = useOSStore.subscribe((state, prev) => {
      if (state.tabs === prev.tabs && state.activeTabId === prev.activeTabId) {
        return;
      }
      const windows = useWindowsStore.getState().windows;
      scheduleSave(state.tabs, state.activeTabId, windows);
    });

    const unsubWindows = useWindowsStore.subscribe((state, prev) => {
      if (state.windows === prev.windows) return;
      const os = useOSStore.getState();
      scheduleSave(os.tabs, os.activeTabId, state.windows);
    });

    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current !== null && pendingFlushRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
        const flush = pendingFlushRef.current;
        pendingFlushRef.current = null;
        saveTimeoutRef.current = null;
        flush();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubOS();
      unsubWindows();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      pendingFlushRef.current = null;
    };
  }, [drivers, userId, companyId]);
}
