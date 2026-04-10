import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailFormProps {
  isLoading: boolean;
  onSubmit: (data: EmailFormData) => void;
}

export function EmailForm({ isLoading, onSubmit }: EmailFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        id="email"
        label="Email"
        type="email"
        placeholder="admin@grindkaro.com"
        error={errors.email?.message}
        {...register("email")}
      />

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
        <Mail className="h-4 w-4" />
        Send OTP
      </Button>
    </form>
  );
}

export type { EmailFormData };
