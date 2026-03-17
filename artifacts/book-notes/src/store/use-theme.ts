import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

const saved = (localStorage.getItem("theme") as Theme | null) ?? "light";
applyTheme(saved);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: saved,
  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      applyTheme(next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
    set({ theme });
  },
}));
