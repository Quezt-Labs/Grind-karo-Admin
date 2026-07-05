import { useRef, useState } from "react";
import { cn } from "@/utils/cn";

interface InlineMetricCellProps {
  value: string;
  onCommit: (next: string) => void;
  isSaving?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  display?: React.ReactNode;
}

const INPUT_BASE =
  "w-full min-w-0 rounded border border-primary-400 bg-white px-1 py-0.5 text-center font-mono text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-primary-500 dark:bg-gray-700 dark:text-gray-100";

const BUTTON_BASE =
  "w-full min-h-[1.75rem] rounded px-1 text-center transition-colors hover:bg-gray-100/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 dark:hover:bg-gray-700/60";

export function InlineMetricCell({
  value,
  onCommit,
  isSaving = false,
  placeholder = "—",
  className,
  inputClassName,
  display,
}: InlineMetricCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setDraft(value);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commit() {
    setEditing(false);
    if (draft.trim() !== value.trim()) {
      onCommit(draft);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        disabled={isSaving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={cn(INPUT_BASE, inputClassName, isSaving && "opacity-60")}
      />
    );
  }

  const hasEditableValue = value.trim().length > 0;
  const hasDisplay = display != null;

  return (
    <button
      type="button"
      onClick={startEditing}
      disabled={isSaving}
      title="Click to edit"
      className={cn(BUTTON_BASE, isSaving && "opacity-60", className)}
    >
      {hasEditableValue || hasDisplay ? (
        (display ?? (
          <span className="font-mono text-sm text-gray-800 dark:text-gray-200">
            {value}
          </span>
        ))
      ) : (
        <span className="text-gray-300 dark:text-gray-600">{placeholder}</span>
      )}
    </button>
  );
}
