import type { ComponentProps } from "react";
import { Checkbox } from "@/components/ui/ShadCheckbox";
import { Label } from "@/components/ui/ShadLabel";
import { cn } from "@/utils/cn";

interface CheckboxFieldProps extends Omit<
  ComponentProps<typeof Checkbox>,
  "checked" | "onCheckedChange"
> {
  label: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  labelClassName?: string;
}

export function CheckboxField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  className,
  labelClassName,
  disabled,
  ...props
}: CheckboxFieldProps) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange?.(value === true)}
        disabled={disabled}
        {...props}
      />
      <div className="grid gap-0.5 leading-none">
        <Label
          htmlFor={id}
          className={cn(
            "cursor-pointer font-normal text-gray-700 dark:text-gray-300",
            disabled && "cursor-not-allowed opacity-50",
            labelClassName,
          )}
        >
          {label}
        </Label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
