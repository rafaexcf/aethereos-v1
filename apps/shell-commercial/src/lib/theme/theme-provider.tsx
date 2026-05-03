import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useUserPreference } from "../../hooks/useUserPreference";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const LEGACY_KEYS = ["aethereos-theme", "theme"] as const;

function readLocal(): Theme {
  for (const key of LEGACY_KEYS) {
    const v = localStorage.getItem(key);
    if (v === "dark" || v === "light") return v;
  }
  return "dark";
}

function writeLocal(theme: Theme): void {
  for (const key of LEGACY_KEYS) {
    try {
      localStorage.setItem(key, theme);
    } catch {
      /* quota — ignore */
    }
  }
}

function applyDom(theme: Theme): void {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readLocal());
  const initialAppliedRef = useRef(false);

  if (!initialAppliedRef.current) {
    applyDom(theme);
    initialAppliedRef.current = true;
  }

  const remote = useUserPreference<Theme>("theme", theme);

  useEffect(() => {
    if (remote.isLoading) return;
    if (remote.value !== theme) {
      setThemeState(remote.value);
      applyDom(remote.value);
      writeLocal(remote.value);
    }
  }, [remote.isLoading, remote.value, theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      applyDom(newTheme);
      writeLocal(newTheme);
      setThemeState(newTheme);
      remote.set(newTheme);
    },
    [remote],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
