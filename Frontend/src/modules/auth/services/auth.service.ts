import { api } from "@/shared/api/api";
import type { LoginResponse, RefreshResponse } from "../types";

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  const { data } = await api.post<LoginResponse>("/auth/login", formData);
  return data;
}

export async function refreshTokenRequest(token: string): Promise<RefreshResponse> {
  const { data } = await api.post<RefreshResponse>("/auth/refresh", {
    refresh_token: token,
  });
  return data;
}

export async function logoutRequest(token: string): Promise<void> {
  await api.post("/auth/logout", { refresh_token: token });
}
