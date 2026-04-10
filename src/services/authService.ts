import api from "./api";
import type {
  SendOtpPayload,
  VerifyOtpPayload,
  AuthResponse,
} from "@/types/auth";

export const authService = {
  async sendOtp(payload: SendOtpPayload): Promise<{ message: string }> {
    const { data } = await api.post("/auth/otp/send", payload);
    return data;
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthResponse> {
    const { data } = await api.post("/auth/otp/verify", payload);
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
