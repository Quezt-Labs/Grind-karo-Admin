import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { userService } from "@/services/userService";
import { cn } from "@/utils/cn";

type Props = {
  userId: string;
  userName: string | null;
  userEmail: string;
  role: string;
  variant?: "button" | "icon";
  onDeleted?: () => void;
  redirectTo?: string;
};

export function DeleteUserButton({
  userId,
  userName,
  userEmail,
  role,
  variant = "button",
  onDeleted,
  redirectTo = "/users",
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const canDelete = role !== "ADMIN";
  const label = userName?.trim() || userEmail;

  const deleteMutation = useMutation({
    mutationFn: () => userService.delete(userId),
    onSuccess: () => {
      toast.success("User deleted");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-purchasers"] });
      void queryClient.invalidateQueries({ queryKey: ["assistant-coaches"] });
      setOpen(false);
      onDeleted?.();
      if (redirectTo) navigate(redirectTo);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete user");
    },
  });

  if (!canDelete) return null;

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600",
            "dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400",
          )}
          title="Delete user"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete user
        </Button>
      )}

      <ConfirmModal
        open={open}
        title="Delete user?"
        message={`This permanently deletes ${label} and related coaching, purchases, logs, and chat data. This cannot be undone.`}
        confirmLabel="Delete user"
        isLoading={deleteMutation.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
