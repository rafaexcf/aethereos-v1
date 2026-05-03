import { useEffect, useRef } from "react";
import { useDrivers } from "../../lib/drivers-context";
import { useSessionStore } from "../../stores/session";
import {
  ACTION_EXECUTORS,
  getActionDef,
  getTriggerDef,
  type ActionId,
  type TriggerId,
  type TriggerPayload,
} from "./registry";
import type { CloudDrivers } from "../../lib/drivers";

interface AutomationRow {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  enabled: boolean;
  trigger_type: TriggerId;
  trigger_config: Record<string, unknown>;
  action_type: ActionId;
  action_config: Record<string, unknown>;
}

interface CalendarEventRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
}

const REALTIME_TABLES: ReadonlyArray<{ table: string; trigger: TriggerId }> = [
  { table: "tasks", trigger: "task.created" },
  { table: "notes", trigger: "note.created" },
  { table: "notifications", trigger: "notification.received" },
];

function getString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

function getNumber(obj: Record<string, unknown>, key: string): number | null {
  const v = obj[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function rowMatchesTrigger(
  triggerType: TriggerId,
  triggerConfig: Record<string, unknown>,
  row: Record<string, unknown>,
): boolean {
  if (triggerType === "task.created") {
    const filterListId = getString(triggerConfig, "list_id");
    if (filterListId.length === 0) return true;
    return getString(row, "list_id") === filterListId;
  }
  if (triggerType === "note.created") {
    return true;
  }
  if (triggerType === "notification.received") {
    if (getString(row, "source_app") === "automacoes") return false;
    const filterType = getString(triggerConfig, "type");
    const filterSource = getString(triggerConfig, "source_app");
    if (filterType.length > 0 && getString(row, "type") !== filterType)
      return false;
    if (
      filterSource.length > 0 &&
      getString(row, "source_app") !== filterSource
    )
      return false;
    return true;
  }
  return false;
}

function buildPayload(
  triggerType: TriggerId,
  row: Record<string, unknown> | null,
): TriggerPayload {
  return {
    triggerId: triggerType,
    timestamp: new Date().toISOString(),
    row,
    fields: {},
  };
}

async function executeAction(
  drivers: CloudDrivers,
  userId: string,
  companyId: string,
  automation: AutomationRow,
  payload: TriggerPayload,
): Promise<void> {
  const def = getActionDef(automation.action_type);
  const executor = ACTION_EXECUTORS[automation.action_type];
  if (def === undefined || executor === undefined) return;
  let status: "success" | "error" = "success";
  try {
    await executor({
      drivers,
      userId,
      companyId,
      payload,
      config: automation.action_config,
    });
  } catch {
    status = "error";
  }
  try {
    await drivers.data
      .from("automations")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: status,
      })
      .eq("id", automation.id);
  } catch {
    // best-effort bookkeeping
  }
}

export function useAutomationEngine(): void {
  const drivers = useDrivers();
  const userId = useSessionStore((s) => s.userId);
  const companyId = useSessionStore((s) => s.activeCompanyId);

  const automationsRef = useRef<AutomationRow[]>([]);
  const dailyFiredRef = useRef<Set<string>>(new Set());
  const upcomingFiredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (drivers === null || userId === null || companyId === null) return;
    const d = drivers;
    const uid = userId;
    const cid = companyId;
    let cancelled = false;

    async function loadAutomations(): Promise<void> {
      try {
        const { data } = await d.data
          .from("automations")
          .select(
            "id,user_id,company_id,name,enabled,trigger_type,trigger_config,action_type,action_config",
          )
          .eq("user_id", uid)
          .eq("company_id", cid)
          .eq("enabled", true);
        if (cancelled) return;
        automationsRef.current = (data ?? []) as AutomationRow[];
      } catch {
        if (!cancelled) automationsRef.current = [];
      }
    }

    void loadAutomations();

    const refreshSub = d.data.subscribeToTable({
      table: "automations",
      event: "*",
      filter: `user_id=eq.${uid}`,
      onData: () => {
        void loadAutomations();
      },
    });

    const realtimeSubs = REALTIME_TABLES.map(({ table, trigger }) =>
      d.data.subscribeToTable({
        table,
        event: "INSERT",
        filter: `user_id=eq.${uid}`,
        onData: (payload) => {
          const row = payload.new as Record<string, unknown> | undefined;
          if (row === undefined) return;
          const matches = automationsRef.current.filter(
            (a) =>
              a.trigger_type === trigger &&
              a.enabled &&
              rowMatchesTrigger(trigger, a.trigger_config, row),
          );
          for (const a of matches) {
            void executeAction(d, uid, cid, a, buildPayload(trigger, row));
          }
        },
      }),
    );

    const tickInterval = window.setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const hhmm = `${hh}:${mm}`;
      const dayKey = now.toISOString().slice(0, 10);

      for (const a of automationsRef.current) {
        if (!a.enabled) continue;
        if (a.trigger_type === "time.daily") {
          const target = getString(a.trigger_config, "time");
          if (target !== hhmm) continue;
          const key = `${a.id}:${dayKey}`;
          if (dailyFiredRef.current.has(key)) continue;
          dailyFiredRef.current.add(key);
          void executeAction(d, uid, cid, a, buildPayload("time.daily", null));
        }
      }

      const upcoming = automationsRef.current.filter(
        (a) => a.enabled && a.trigger_type === "event.upcoming",
      );
      if (upcoming.length > 0) {
        void checkUpcomingEvents(
          d,
          uid,
          cid,
          upcoming,
          upcomingFiredRef.current,
        );
      }
    }, 60_000);

    return () => {
      cancelled = true;
      refreshSub.unsubscribe();
      realtimeSubs.forEach((s) => s.unsubscribe());
      window.clearInterval(tickInterval);
    };
  }, [drivers, userId, companyId]);
}

async function checkUpcomingEvents(
  drivers: CloudDrivers,
  userId: string,
  companyId: string,
  automations: AutomationRow[],
  firedKeys: Set<string>,
): Promise<void> {
  const maxMinutes = automations.reduce((max, a) => {
    const m = getNumber(a.trigger_config, "minutes_before") ?? 15;
    return Math.max(max, m);
  }, 15);
  const now = Date.now();
  const horizonMs = (maxMinutes + 2) * 60_000;

  let events: CalendarEventRow[];
  try {
    const { data } = await drivers.data
      .from("calendar_events")
      .select("id,title,start_at,end_at")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .gte("start_at", new Date(now).toISOString())
      .lte("start_at", new Date(now + horizonMs).toISOString());
    events = (data ?? []) as CalendarEventRow[];
  } catch {
    return;
  }
  if (events.length === 0) return;

  for (const a of automations) {
    const minutesBefore = getNumber(a.trigger_config, "minutes_before") ?? 15;
    for (const ev of events) {
      const startMs = new Date(ev.start_at).getTime();
      if (!Number.isFinite(startMs)) continue;
      const diffMin = (startMs - now) / 60_000;
      if (diffMin < 0 || diffMin > minutesBefore) continue;
      const key = `${a.id}:${ev.id}`;
      if (firedKeys.has(key)) continue;
      firedKeys.add(key);
      const payload: TriggerPayload = {
        triggerId: "event.upcoming",
        timestamp: new Date().toISOString(),
        row: ev as unknown as Record<string, unknown>,
        fields: { minutes_before: minutesBefore },
      };
      const def = getTriggerDef("event.upcoming");
      if (def === undefined) continue;
      const executor = ACTION_EXECUTORS[a.action_type];
      if (executor === undefined) continue;
      try {
        await executor({
          drivers,
          userId,
          companyId,
          payload,
          config: a.action_config,
        });
        await drivers.data
          .from("automations")
          .update({
            last_run_at: new Date().toISOString(),
            last_run_status: "success",
          })
          .eq("id", a.id);
      } catch {
        await drivers.data
          .from("automations")
          .update({
            last_run_at: new Date().toISOString(),
            last_run_status: "error",
          })
          .eq("id", a.id);
      }
    }
  }
}
