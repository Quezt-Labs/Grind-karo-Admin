import { useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { FormCheckPresetCommentsDialog } from "@/components/shared/FormCheckPresetCommentsDialog";
import { useFormCheckPresetComments } from "@/hooks/useFormCheckPresetComments";
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
  const { comments, isLoading } = useFormCheckPresetComments();
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-1", className)}>
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
        ) : (
          comments.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(preset.body)}
              title={preset.body}
              className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-left text-[10px] font-medium leading-snug text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
            >
              {preset.body}
            </button>
          ))
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setManageOpen(true)}
          title="Manage quick comments"
          className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-indigo-300 px-2 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
        >
          <Settings2 className="h-3 w-3" />
          Manage
        </button>
      </div>
      <FormCheckPresetCommentsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
      />
    </>
  );
}
