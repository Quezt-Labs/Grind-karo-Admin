import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { APP_NAME } from "@/utils/constants";
import { LoginBackground } from "@/components/auth/LoginBackground";
import {
  AdminLoginForm,
  type LoginFormData,
} from "@/components/auth/AdminLoginForm";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function onLogin(data: LoginFormData) {
    setIsLoading(true);
    try {
      const response = await authService.login({
        email: data.email,
        password: data.password,
      });
      login(response.user, response.accessToken, response.refreshToken);
      toast.success(`Welcome, ${response.user.name || response.user.email}!`);
      navigate(
        response.user.role === "ASSISTANT_COACH"
          ? "/coach/dashboard"
          : "/dashboard",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid credentials";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 dark:bg-gray-900">
      <LoginBackground />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border bg-white/80 p-8 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-lg shadow-primary-500/25">
              <img
                src="/grind-karo-logo.png"
                alt={APP_NAME}
                className="h-16 w-16 rounded-lg object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Sign in to your admin panel
            </p>
          </div>

          <AdminLoginForm isLoading={isLoading} onSubmit={onLogin} />
        </div>
      </div>
    </div>
  );
}
