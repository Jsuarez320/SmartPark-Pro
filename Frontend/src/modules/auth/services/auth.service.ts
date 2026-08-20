import { api } from "@/shared/api/api";
import type { LoginResponse } from "../types";

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  const { data } = await api.post<LoginResponse>("/auth/login", formData);
  return data;
}
