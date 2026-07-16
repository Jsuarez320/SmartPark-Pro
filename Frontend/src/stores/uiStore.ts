import { create } from "zustand";

interface UiState {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: "light",
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle("dark", theme === "dark");
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      return { theme: next };
    }),
}));
