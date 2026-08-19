export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  nombre: string;
  es_admin: boolean;
}

export interface User {
  id: string;
  nombre: string;
  role: string;
}
