import { create } from "zustand";
import type { LoginResponse } from "./services/auth.service";

interface AuthState {
  user: { id: number; username: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setSession: (data: LoginResponse) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const { loginRequest } = await import("./services/auth.service");
      const data = await loginRequest(username, password);
      set({
        user: data.user,
        token: data.access_token,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      return true;
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || err?.message || "Error al iniciar sesión";
      set({ loading: false, error: message });
      return false;
    }
  },

  logout: () => {
    set({ user: null, token: null, isAuthenticated: false, loading: false, error: null });
  },

  setSession: (data) => {
    set({
      user: data.user,
      token: data.access_token,
      isAuthenticated: true,
      loading: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
