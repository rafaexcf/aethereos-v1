// Components
export { AppShell } from "./components/app-shell/index";
export type { AppShellProps } from "./components/app-shell/index";
export { WindowManager } from "./components/window-manager/index";
export type {
  WindowConfig,
  WindowManagerProps,
} from "./components/window-manager/index";
export { Dock } from "./components/dock/index";
export type { DockItem, DockProps } from "./components/dock/index";
export { Tabs } from "./components/tabs/index";
export type { TabItem, TabsProps } from "./components/tabs/index";
export { Desktop } from "./components/desktop/index";
export type { DesktopProps } from "./components/desktop/index";
export { Mesa } from "./components/mesa/index";
export type { MesaWidget, MesaProps } from "./components/mesa/index";

// Primitives
export { Button } from "./primitives/button";
export type { ButtonProps } from "./primitives/button";

// Theme
export { SHELL_TOKENS, DEFAULT_CSS_VARIABLES } from "./theme/tokens";
export type { ShellTokens } from "./theme/tokens";
export { applyTheme, DEFAULT_THEME } from "./theme/theming";
export type { DistributionTheme } from "./theme/theming";

// Hooks
export { useTheme } from "./hooks/use-theme";

// Feature Flags
export {
  FeatureFlagsProvider,
  useFeatureFlag,
  useFeatureFlagsContext,
} from "./feature-flags/index";
export type {
  FeatureFlagState,
  FeatureFlagsProviderProps,
  FeatureFlagsContextValue,
} from "./feature-flags/index";
