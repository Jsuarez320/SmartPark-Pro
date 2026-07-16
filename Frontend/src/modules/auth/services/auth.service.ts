import { api } from "@/shared/api/api";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  nombre: string;
  es_admin: boolean;
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  const { data } = await api.post<LoginResponse>("/auth/login", formData);
  return data;
}
