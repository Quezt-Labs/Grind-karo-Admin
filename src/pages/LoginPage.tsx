import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { APP_NAME } from "@/utils/constants";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      login(response.user, response.token);
      toast.success(`Welcome back, ${response.user.name}!`);
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white p-8 shadow-sm dark:bg-gray-800">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Sign in to your admin panel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="admin@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Demo credentials:
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Email:{" "}
              <code className="text-primary-600 dark:text-primary-400">
                admin@example.com
              </code>
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Password:{" "}
              <code className="text-primary-600 dark:text-primary-400">
                password123
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
