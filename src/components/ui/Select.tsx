import { cn } from "@/utils/cn";
import type { FocusEventHandler } from "react";
import { FieldInfoIcon } from "@/components/ui/FieldInfoIcon";
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";

const EMPTY_SENTINEL = "__empty__";

export interface SelectOption {
  value: string;
  label: string;
  info?: string;
}

interface SelectProps {
  label?: string;
  labelInfo?: string;
  error?: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /** @deprecated Prefer onValueChange — kept for legacy callers */
  onChange?: (e: { target: { value: string; name: string } }) => void;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Select({
  label,
  labelInfo,
  error,
  options,
  value,
  onValueChange,
  onChange,
  onBlur,
  name,
  placeholder = "Select...",
  disabled,
  className,
  id,
}: SelectProps) {
  const mappedOptions = options.map((o) =>
    o.value === "" ? { ...o, value: EMPTY_SENTINEL } : o,
  );
  const mappedValue = value === "" ? EMPTY_SENTINEL : value;

  function handleValueChange(next: string) {
    const resolved = next === EMPTY_SENTINEL ? "" : next;
    onValueChange?.(resolved);
    onChange?.({ target: { value: resolved, name: name ?? "" } });
  }

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
          {labelInfo && <FieldInfoIcon title={labelInfo} />}
        </div>
      )}
      <ShadSelect
        value={mappedValue || undefined}
        onValueChange={handleValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectTrigger
          id={id}
          onBlur={onBlur}
          className={cn(
            error &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {mappedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex w-full items-center justify-between gap-3 pr-1">
                <span>{option.label}</span>
                {option.info && <FieldInfoIcon title={option.info} />}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
