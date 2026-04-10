import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { APP_NAME } from "@/utils/constants";
import { LoginBackground } from "@/components/auth/LoginBackground";
import { EmailForm, type EmailFormData } from "@/components/auth/EmailForm";
import { OtpForm, type OtpFormData } from "@/components/auth/OtpForm";

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
              {step === "email"
                ? "Sign in to your admin panel"
                : `Enter the OTP sent to ${email}`}
            </p>
          </div>

          {step === "email" ? (
            <EmailForm isLoading={isLoading} onSubmit={onSendOtp} />
          ) : (
            <OtpForm
              email={email}
              isLoading={isLoading}
              onSubmit={onVerifyOtp}
              onBack={() => setStep("email")}
              onResend={() => onSendOtp({ email })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
