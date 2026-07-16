import { create } from "zustand";

export interface User {
  id: string;
  nombre: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export function isAdminRole(role: string | undefined): boolean {
  return role === "admin";
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const { loginRequest } = await import("@/modules/auth/services/auth.service");
      const data = await loginRequest(username, password);
      const user: User = {
        id: data.user_id,
        nombre: data.nombre,
        role: data.es_admin ? "admin" : "employee",
      };
      set({
        user,
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

  clearError: () => set({ error: null }),
}));
