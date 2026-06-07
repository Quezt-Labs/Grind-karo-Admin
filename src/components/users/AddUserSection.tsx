import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { userService } from "@/services/userService";
import type { CreateAdminUserPayload } from "@/types/user";

type Props = {
  onClose: () => void;
};

export function AddUserSection({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<CreateAdminUserPayload["role"]>("USER");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      userService.create({
        email: email.trim(),
        name: name.trim() || undefined,
        role,
        password: role === "ASSISTANT_COACH" ? password : undefined,
      }),
    onSuccess: (result) => {
      toast.success(
        result.created
          ? `${role === "ASSISTANT_COACH" ? "Assistant coach" : "User"} created`
          : "Existing user updated",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["assistant-coaches"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create user");
    },
  });

  const canSubmit =
    email.trim().length > 0 &&
    (role === "USER" || password.length >= 8) &&
    !createMutation.isPending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        Add user
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        App users sign in with OTP. Assistant coaches use the admin login with
        email and password.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Role
          </label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as CreateAdminUserPayload["role"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">App user</SelectItem>
              <SelectItem value="ASSISTANT_COACH">Assistant coach</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
        />
        {role === "ASSISTANT_COACH" && (
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => createMutation.mutate()} disabled={!canSubmit}>
          Create user
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
