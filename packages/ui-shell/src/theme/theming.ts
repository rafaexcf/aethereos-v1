import { DEFAULT_CSS_VARIABLES } from "./tokens.js";

export interface DistributionTheme {
  readonly name: string;
  readonly cssVariables: string;
}

/**
 * applyTheme — injeta CSS variables de tema no document para distribuições.
 * Permite que cada distribuição (B2B AI OS Brazil, etc.) customize cores
 * sem recompilar o bundle.
 *
 * Ref: ADR-0014 convergências (Tailwind v4 runtime CSS variables)
 */
export function applyTheme(theme?: DistributionTheme): void {
  const css = theme?.cssVariables ?? DEFAULT_CSS_VARIABLES;

  const existingStyle = document.getElementById("ae-theme");
  if (existingStyle !== null) {
    existingStyle.textContent = css;
    return;
  }

  const style = document.createElement("style");
  style.id = "ae-theme";
  style.textContent = css;
  document.head.appendChild(style);
}

/** Tema padrão Aethereos */
export const DEFAULT_THEME: DistributionTheme = {
  name: "aethereos-default",
  cssVariables: DEFAULT_CSS_VARIABLES,
};
