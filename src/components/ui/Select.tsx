import { cn } from "@/utils/cn";
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";

interface SelectProps {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (e: { target: { value: string; name: string } }) => void;
  onBlur?: (e: { target: { value: string; name: string } }) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

const EMPTY_SENTINEL = "__empty__";

export function Select({
  label,
  error,
  options,
  value,
  onChange,
  onBlur,
  name,
  placeholder = "Select...",
  disabled,
  className,
  id,
  ref,
}: SelectProps) {
  // Radix Select does not allow empty string values, so map them
  const mappedOptions = options.map((o) =>
    o.value === "" ? { ...o, value: EMPTY_SENTINEL } : o,
  );
  const mappedValue = value === "" ? EMPTY_SENTINEL : value;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <ShadSelect
        value={mappedValue || undefined}
        onValueChange={(v) =>
          onChange?.({
            target: { value: v === EMPTY_SENTINEL ? "" : v, name: name ?? "" },
          })
        }
        disabled={disabled}
      >
        <SelectTrigger
          ref={ref}
          id={id}
          name={name}
          onBlur={() =>
            onBlur?.({ target: { value: mappedValue ?? "", name: name ?? "" } })
          }
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
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
