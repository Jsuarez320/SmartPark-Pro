import { create } from "zustand";

interface AuthState {
  user: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: localStorage.getItem("auth_user"),
  isAuthenticated: !!localStorage.getItem("auth_user"),

  login: (username, password) => {
    if (username === "admin" && password === "1234") {
      localStorage.setItem("auth_user", username);
      set({ user: username, isAuthenticated: true });
      return true;
    }
    return false;
  },

  logout: () => {
    localStorage.removeItem("auth_user");
    set({ user: null, isAuthenticated: false });
  },
}));
