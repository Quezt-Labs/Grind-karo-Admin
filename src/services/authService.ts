import api from "./api";
import type { AdminLoginPayload, AuthResponse } from "@/types/auth";

export const authService = {
  async login(payload: AdminLoginPayload): Promise<AuthResponse> {
    const { data } = await api.post("/auth/admin/login", payload);
    return data;
  },

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { data } = await api.post("/auth/token/refresh", { refreshToken });
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch {
      // Silently fail — we clear local state regardless
    }
  },
};
