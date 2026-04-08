import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem("theme") as Theme | null) ?? "light";
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,

  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", next);
      }
      applyTheme(next);
      return { theme: next };
    }),

  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }
    applyTheme(theme);
    set({ theme });
  },
}));