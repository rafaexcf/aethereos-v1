import React, { createContext, useContext, useState, useCallback } from "react";

export interface FeatureFlagState {
  enabled: boolean;
  loading: boolean;
  variant: string;
}

export interface FeatureFlagsContextValue {
  flags: Record<string, FeatureFlagState>;
  setFlag(name: string, state: FeatureFlagState): void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: {},
  setFlag: () => undefined,
});

export interface FeatureFlagsProviderProps {
  initial?: Record<string, FeatureFlagState>;
  children: React.ReactNode;
}

export function FeatureFlagsProvider({
  initial = {},
  children,
}: FeatureFlagsProviderProps) {
  const [flags, setFlags] = useState<Record<string, FeatureFlagState>>(initial);

  const setFlag = useCallback((name: string, state: FeatureFlagState) => {
    setFlags((prev) => ({ ...prev, [name]: state }));
  }, []);

  return (
    <FeatureFlagsContext.Provider value={{ flags, setFlag }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlag(name: string): FeatureFlagState {
  const ctx = useContext(FeatureFlagsContext);
  return (
    ctx.flags[name] ?? { enabled: false, loading: false, variant: "disabled" }
  );
}

export function useFeatureFlagsContext(): FeatureFlagsContextValue {
  return useContext(FeatureFlagsContext);
}
