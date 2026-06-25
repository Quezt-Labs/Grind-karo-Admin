import { Info } from "lucide-react";
import { cn } from "@/utils/cn";

interface FieldInfoIconProps {
  title: string;
  className?: string;
}

export function FieldInfoIcon({ title, className }: FieldInfoIconProps) {
  return (
    <span
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex shrink-0 cursor-help text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}
