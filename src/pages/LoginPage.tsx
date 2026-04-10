import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { APP_NAME } from "@/utils/constants";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

const otpSchema = z.object({
  otp: z
    .string()
    .min(1, "OTP is required")
    .regex(/^\d{4,6}$/, "Enter a valid OTP"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSendOtp(data: EmailFormData) {
    setIsLoading(true);
    try {
      await authService.sendOtp({ email: data.email });
      setEmail(data.email);
      setStep("otp");
      toast.success("OTP sent to your email!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send OTP";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerifyOtp(data: OtpFormData) {
    setIsLoading(true);
    try {
      const response = await authService.verifyOtp({
        email,
        otp: data.otp,
      });
      login(response.user, response.accessToken, response.refreshToken);
      toast.success(`Welcome, ${response.user.name || response.user.email}!`);
      navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid OTP";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    setStep("email");
    otpForm.reset();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 dark:bg-gray-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-500/5" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl dark:bg-accent-500/5" />
        <div className="absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-400/5 blur-2xl dark:bg-primary-400/5" />
      </div>

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
              {step === "email"
                ? "Sign in to your admin panel"
                : `Enter the OTP sent to ${email}`}
            </p>
          </div>

          {step === "email" ? (
            <form
              onSubmit={emailForm.handleSubmit(onSendOtp)}
              className="space-y-5"
            >
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="admin@grindkaro.com"
                error={emailForm.formState.errors.email?.message}
                {...emailForm.register("email")}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                <Mail className="h-4 w-4" />
                Send OTP
              </Button>
            </form>
          ) : (
            <form
              onSubmit={otpForm.handleSubmit(onVerifyOtp)}
              className="space-y-5"
            >
              <Input
                id="otp"
                label="OTP Code"
                type="text"
                inputMode="numeric"
                placeholder="Enter OTP"
                autoFocus
                maxLength={6}
                error={otpForm.formState.errors.otp?.message}
                {...otpForm.register("otp")}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Verify & Sign in
              </Button>

              <button
                type="button"
                onClick={handleBack}
                className="flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Use a different email
              </button>

              <button
                type="button"
                onClick={() => onSendOtp({ email })}
                disabled={isLoading}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50"
              >
                Resend OTP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
