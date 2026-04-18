import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

interface AdminLoginFormProps {
  isLoading: boolean;
  onSubmit: (data: LoginFormData) => void;
}

export function AdminLoginForm({ isLoading, onSubmit }: AdminLoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema) as Resolver<LoginFormData>,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        id="email"
        label="Email"
        type="email"
        placeholder="admin@grindkaro.in"
        autoFocus
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
      <Button type="submit" isLoading={isLoading} className="w-full">
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    </form>
  );
}
