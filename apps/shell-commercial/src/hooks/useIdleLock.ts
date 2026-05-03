import { useEffect, useRef } from "react";
import { useSessionStore } from "../stores/session";

const IDLE_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "keydown",
  "click",
  "touchstart",
  "wheel",
];

export function useIdleLock(timeoutMinutes: number): void {
  const lock = useSessionStore((s) => s.lock);
  const isLocked = useSessionStore((s) => s.isLocked);
  const userId = useSessionStore((s) => s.userId);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userId === null) return;
    if (isLocked) return;
    if (timeoutMinutes <= 0) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;

    function clearTimer(): void {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function scheduleLock(): void {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        if (!useSessionStore.getState().isLocked) {
          lock();
        }
      }, timeoutMs);
    }

    function onActivity(): void {
      if (useSessionStore.getState().isLocked) return;
      scheduleLock();
    }

    function onVisibility(): void {
      if (document.visibilityState === "visible") {
        scheduleLock();
      }
    }

    scheduleLock();
    for (const evt of IDLE_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimer();
      for (const evt of IDLE_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [lock, isLocked, userId, timeoutMinutes]);
}
