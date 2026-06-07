export type StaffRole = "ADMIN" | "ASSISTANT_COACH";

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: StaffRole;
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
