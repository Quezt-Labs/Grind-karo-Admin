import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const otpSchema = z.object({
  otp: z
    .string()
    .min(1, "OTP is required")
    .regex(/^\d{4,6}$/, "Enter a valid OTP"),
});

type OtpFormData = z.infer<typeof otpSchema>;

interface OtpFormProps {
  email: string;
  isLoading: boolean;
  onSubmit: (data: OtpFormData) => void;
  onBack: () => void;
  onResend: () => void;
}

export function OtpForm({
  email,
  isLoading,
  onSubmit,
  onBack,
  onResend,
}: OtpFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        id="otp"
        label="OTP Code"
        type="text"
        inputMode="numeric"
        placeholder="Enter OTP"
        autoFocus
        maxLength={6}
        error={errors.otp?.message}
        {...register("otp")}
      />

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
        Verify & Sign in
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Use a different email
      </button>

      <button
        type="button"
        onClick={onResend}
        disabled={isLoading}
        className="w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50"
      >
        Resend OTP
      </button>
    </form>
  );
}

export type { OtpFormData };
