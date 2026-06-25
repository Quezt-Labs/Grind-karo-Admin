import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/ShadDialog";
import { cn } from "@/utils/cn";

interface FormModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FormModal({
  title,
  onClose,
  children,
  className,
  contentClassName,
}: FormModalProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "mx-4 max-h-[90vh] overflow-y-auto",
          contentClassName,
          className,
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="mb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
