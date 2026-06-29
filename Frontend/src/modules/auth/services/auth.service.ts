import { api } from "@/shared/api/api";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: { id: number; username: string };
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  const { data } = await api.post<LoginResponse>("/auth/login", formData);
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout");
}
