import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000"
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints que NO deben disparar el refresh automático (evita bucles).
const AUTH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

// Single-flight: si llegan varios 401 en paralelo, se emite UN solo refresh
// y todas las requests esperan el mismo resultado.
let refreshPromise: Promise<string | null> | null = null;

/** Respuesta de POST /auth/refresh (par rotado y rol fresco). */
interface RefreshApiResponse {
  access_token: string;
  refresh_token: string;
  es_admin: boolean;
}

async function intentarRefresh(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    // axios "pelado" (sin los interceptores de `api`): evita bucles y no depende de ningún módulo.
    const { data } = await axios.post<RefreshApiResponse>(`${api.defaults.baseURL}/auth/refresh`, {
      refresh_token: refreshToken,
    });
    // Persistir el par rotado y el rol fresco (es_admin re-leído de la DB).
    useAuthStore.setState((state) => ({
      token: data.access_token,
      refreshToken: data.refresh_token,
      user: state.user
        ? { ...state.user, role: data.es_admin ? "admin" : "employee" }
        : state.user,
    }));
    return data.access_token;
  } catch (err: any) {
    // El servidor rechazó el refresh (expirado/revocado): sesión inválida.
    if (err?.response) return null;
    // Error de red: no limpiar la sesión, la request original fallará por sí sola.
    throw err;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;

    // H-10 (403): permisos insuficientes. No es problema de token:
    // NO refrescar ni redirigir a login, solo informar.
    if (status === 403) {
      error.message = "No tenés permisos para realizar esta acción";
      return Promise.reject(error);
    }

    // H-10 (401): token expirado/inválido → intentar renovar y reintentar.
    if (
      status === 401 &&
      original &&
      !original._retry &&
      !AUTH_PATHS.some((p) => original.url?.includes(p))
    ) {
      original._retry = true;
      try {
        refreshPromise ??= intentarRefresh().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;

        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }

        // Refresh rechazado: limpiar estado + sessionStorage. AppLayout
        // redirige a /login al detectar isAuthenticated=false.
        useAuthStore.getState().logout();
      } catch {
        // Red caída durante el refresh: no cerrar sesión.
      }
    }

    return Promise.reject(error);
  }
);
