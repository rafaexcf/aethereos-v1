import { useEffect } from "react";
import { applyTheme } from "../theme/theming";
import type { DistributionTheme } from "../theme/theming";

/**
 * useTheme — hook para aplicar tema de distribuição no shell.
 * Distribuidores passam seu tema customizado; default usa tokens canônicos.
 */
export function useTheme(theme?: DistributionTheme): void {
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
}
