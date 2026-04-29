import { createContext, useContext } from "react";
import type { BootResult } from "./boot";

const BootCtx = createContext<BootResult | null>(null);

export const BootProvider = BootCtx.Provider;

export function useBootResult(): BootResult {
  const ctx = useContext(BootCtx);
  if (!ctx) throw new Error("useBootResult must be used within BootProvider");
  return ctx;
}
