import { FORM_CHECK_PRESET_COMMENTS } from "@/constants/formCheckComments";
import { cn } from "@/utils/cn";

export function FormCheckPresetCommentChips({
  onSelect,
  disabled,
  className,
}: {
  onSelect: (comment: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {FORM_CHECK_PRESET_COMMENTS.map((comment) => (
        <button
          key={comment}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(comment)}
          title={comment}
          className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-left text-[10px] font-medium leading-snug text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
        >
          {comment}
        </button>
      ))}
    </div>
  );
}
