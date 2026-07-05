import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { FormCheckPresetCommentChips } from "@/components/shared/FormCheckPresetCommentChips";
import type { BulkCommentResult } from "@/utils/bulkFormCheckComments";
import { cn } from "@/utils/cn";

interface BulkFormCheckCommentBarProps {
  pendingCount: number;
  onApply: (comment: string) => Promise<BulkCommentResult>;
  className?: string;
}

function showBulkResultToast(result: BulkCommentResult) {
  const { succeeded, failed, errors } = result;
  if (failed === 0 && succeeded > 0) {
    toast.success(`${succeeded} comment${succeeded === 1 ? "" : "s"} saved`);
    return;
  }
  if (succeeded > 0 && failed > 0) {
    const detail = errors[0]?.message;
    toast.error(
      `${succeeded} saved · ${failed} failed${detail ? ` — ${detail}` : ""}`,
    );
    return;
  }
  if (failed > 0) {
    const detail = errors[0]?.message ?? "Failed to save comments";
    toast.error(detail);
  }
}

export function BulkFormCheckCommentBar({
  pendingCount,
  onApply,
  className,
}: BulkFormCheckCommentBarProps) {
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleApply = async () => {
    const trimmed = comment.trim();
    if (!trimmed || pendingCount === 0 || saving) return;

    setSaving(true);
    try {
      const result = await onApply(trimmed);
      showBulkResultToast(result);
      if (result.succeeded > 0) {
        setComment("");
      }
    } finally {
      setSaving(false);
    }
  };

  if (pendingCount === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-800/60 dark:bg-indigo-900/20",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        <MessageSquare className="h-3 w-3" />
        Bulk comment
      </div>
      <FormCheckPresetCommentChips
        className="mb-2"
        disabled={saving}
        onSelect={setComment}
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Same feedback for all pending videos…"
        className="w-full resize-y rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />
      <button
        type="button"
        disabled={!comment.trim() || saving}
        onClick={() => void handleApply()}
        className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
      >
        {saving && <Loader2 className="h-3 w-3 animate-spin" />}
        Apply to all pending ({pendingCount})
      </button>
    </div>
  );
}
