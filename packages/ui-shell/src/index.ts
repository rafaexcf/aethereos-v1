// Components
export { WindowManager } from "./components/window-manager/index.js";
export type {
  WindowConfig,
  WindowManagerProps,
} from "./components/window-manager/index.js";
export { Dock } from "./components/dock/index.js";
export type { DockItem, DockProps } from "./components/dock/index.js";
export { Tabs } from "./components/tabs/index.js";
export type { TabItem, TabsProps } from "./components/tabs/index.js";
export { Desktop } from "./components/desktop/index.js";
export type { DesktopProps } from "./components/desktop/index.js";
export { Mesa } from "./components/mesa/index.js";
export type { MesaWidget, MesaProps } from "./components/mesa/index.js";

// Primitives
export { Button } from "./primitives/button.js";
export type { ButtonProps } from "./primitives/button.js";

// Theme
export { SHELL_TOKENS, DEFAULT_CSS_VARIABLES } from "./theme/tokens.js";
export type { ShellTokens } from "./theme/tokens.js";
export { applyTheme, DEFAULT_THEME } from "./theme/theming.js";
export type { DistributionTheme } from "./theme/theming.js";

// Hooks
export { useTheme } from "./hooks/use-theme.js";
