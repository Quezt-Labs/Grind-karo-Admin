export interface User {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN";
}

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
