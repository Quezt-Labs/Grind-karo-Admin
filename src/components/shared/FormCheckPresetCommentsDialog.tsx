import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/ShadDialog";
import { useFormCheckPresetComments } from "@/hooks/useFormCheckPresetComments";
import { cn } from "@/utils/cn";

interface FormCheckPresetCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormCheckPresetCommentsDialog({
  open,
  onOpenChange,
}: FormCheckPresetCommentsDialogProps) {
  const {
    comments,
    isLoading,
    createMutation,
    updateMutation,
    removeMutation,
  } = useFormCheckPresetComments();
  const [newBody, setNewBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending;

  const handleCreate = async () => {
    const trimmed = newBody.trim();
    if (!trimmed || saving) return;
    try {
      await createMutation.mutateAsync(trimmed);
      setNewBody("");
      toast.success("Preset added");
    } catch {
      toast.error("Could not add preset");
    }
  };

  const startEdit = (id: string, body: string) => {
    setEditingId(id);
    setEditBody(body);
  };

  const handleSaveEdit = async () => {
    if (!editingId || saving) return;
    const trimmed = editBody.trim();
    if (!trimmed) return;
    try {
      await updateMutation.mutateAsync({ id: editingId, body: trimmed });
      setEditingId(null);
      setEditBody("");
      toast.success("Preset updated");
    } catch {
      toast.error("Could not update preset");
    }
  };

  const handleDelete = async (id: string) => {
    if (saving) return;
    try {
      await removeMutation.mutateAsync(id);
      if (editingId === id) {
        setEditingId(null);
        setEditBody("");
      }
      toast.success("Preset removed");
    } catch {
      toast.error("Could not remove preset");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick comment presets</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          One-tap chips when reviewing form-check videos. Each coach has their
          own list.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          </div>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {comments.map((preset) => (
              <li
                key={preset.id}
                className="rounded-lg border border-gray-200 p-2 dark:border-gray-700"
              >
                {editingId === preset.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!editBody.trim() || saving}
                        onClick={() => void handleSaveEdit()}
                        className="rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditBody("");
                        }}
                        className="rounded-md px-2 py-1 text-[11px] text-gray-600 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-xs leading-snug text-gray-800 dark:text-gray-100">
                      {preset.body}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => startEdit(preset.id, preset.body)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleDelete(preset.id)}
                        className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {comments.length === 0 && (
              <li className="py-4 text-center text-xs text-gray-500">
                No presets yet — add one below.
              </li>
            )}
          </ul>
        )}

        <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Add preset
          </label>
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={2}
            placeholder="e.g. Solid progress today."
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-900"
          />
          <button
            type="button"
            disabled={!newBody.trim() || saving}
            onClick={() => void handleCreate()}
            className={cn(
              "inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50",
            )}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Add preset
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
