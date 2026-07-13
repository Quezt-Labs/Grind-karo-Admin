import { useState } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { FormCheckPresetCommentsDialog } from "@/components/shared/FormCheckPresetCommentsDialog";
import { useFormCheckPresetComments } from "@/hooks/useFormCheckPresetComments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
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
  // Remount after pick so the same preset can be chosen again (always uncontrolled).
  const [selectKey, setSelectKey] = useState(0);

  return (
    <>
      <div className={cn("flex items-center gap-1.5", className)}>
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
        ) : (
          <Select
            key={selectKey}
            disabled={disabled || comments.length === 0}
            onValueChange={(id) => {
              const preset = comments.find((c) => c.id === id);
              if (!preset) return;
              onSelect(preset.body);
              setSelectKey((k) => k + 1);
            }}
          >
            <SelectTrigger
              className={cn(
                "h-8 min-w-0 flex-1 border-indigo-200 bg-white text-xs text-indigo-800 shadow-none",
                "focus:border-indigo-400 focus:ring-indigo-500/20",
                "dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
              )}
            >
              <SelectValue
                placeholder={
                  comments.length === 0
                    ? "No quick comments yet"
                    : "Insert quick comment…"
                }
              />
            </SelectTrigger>
            <SelectContent className="max-w-md">
              {comments.map((preset) => (
                <SelectItem
                  key={preset.id}
                  value={preset.id}
                  className="whitespace-normal py-2 text-xs leading-snug"
                  title={preset.body}
                >
                  {preset.body}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setManageOpen(true)}
          title="Manage quick comments"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-dashed border-indigo-300 px-2 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
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
