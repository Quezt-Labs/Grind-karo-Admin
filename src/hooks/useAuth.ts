import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, token, refreshToken, isAuthenticated, login, logout } =
    useAuthStore();
  return { user, token, refreshToken, isAuthenticated, login, logout };
}
