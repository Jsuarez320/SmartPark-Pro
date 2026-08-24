import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/modules/auth/types";

export type { User };

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
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
            refreshToken: data.refresh_token,
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
        const { refreshToken } = get();
        // Limpiar estado primero: sessionStorage se vacía vía persist y
        // AppLayout redirige a /login al detectar isAuthenticated=false.
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          loading: false,
          error: null,
        });
        if (refreshToken) {
          // Revocar el refresh token en el backend (fire-and-forget).
          void import("@/modules/auth/services/auth.service")
            .then(({ logoutRequest }) => logoutRequest(refreshToken))
            .catch(() => {});
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "smartpark-auth",
      version: 1,
      // H-11: sessionStorage (NO localStorage). Al cerrar la ventana/proceso de
      // Electron el storage se borra y siempre se exige login de nuevo.
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
