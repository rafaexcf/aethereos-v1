import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  const label =
    theme === "dark" ? "Alternar para modo claro" : "Alternar para modo escuro";

  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={theme === "dark"}
      className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-[120ms]"
    >
      <Icon size={18} strokeWidth={1.5} />
    </button>
  );
}
