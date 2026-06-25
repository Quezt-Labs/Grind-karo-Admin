import { memo } from "react";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { cn } from "@/utils/cn";

interface TreeNodeActionsProps {
  onAdd?: () => void;
  addTitle?: string;
  onClone?: () => void;
  cloneTitle?: string;
  onEdit: () => void;
  editTitle?: string;
  onDelete: () => void;
  deleteTitle?: string;
  size?: "sm" | "md";
}

export const TreeNodeActions = memo(function TreeNodeActions({
  onAdd,
  addTitle = "Add",
  onClone,
  cloneTitle = "Clone",
  onEdit,
  editTitle = "Edit",
  onDelete,
  deleteTitle = "Delete",
  size = "sm",
}: TreeNodeActionsProps) {
  const iconCn = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div
      className={cn("flex items-center", size === "md" ? "gap-1" : "gap-0.5")}
    >
      {onAdd && (
        <button
          onClick={onAdd}
          className={cn(
            "rounded-md p-1.5 text-gray-400 hover:text-primary-500",
            size === "md"
              ? "hover:bg-gray-100 dark:hover:bg-gray-700"
              : "hover:bg-white dark:hover:bg-gray-700",
          )}
          title={addTitle}
        >
          <Plus className={iconCn} />
        </button>
      )}
      {onClone && (
        <button
          onClick={onClone}
          className={cn(
            "rounded-md p-1.5 text-gray-400 hover:text-primary-500",
            size === "md"
              ? "hover:bg-gray-100 dark:hover:bg-gray-700"
              : "hover:bg-white dark:hover:bg-gray-700",
          )}
          title={cloneTitle}
        >
          <Copy className={iconCn} />
        </button>
      )}
      <button
        onClick={onEdit}
        className={cn(
          "rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
          size === "md"
            ? "hover:bg-gray-100 dark:hover:bg-gray-700"
            : "hover:bg-white dark:hover:bg-gray-700",
        )}
        title={editTitle}
      >
        <Pencil className={iconCn} />
      </button>
      <button
        onClick={onDelete}
        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        title={deleteTitle}
      >
        <Trash2 className={iconCn} />
      </button>
    </div>
  );
});
