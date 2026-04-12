import { Trash2, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Program } from "@/types/program";

interface ProgramDangerZoneProps {
  program: Program;
  isToggling: boolean;
  onToggleStatus: () => void;
  onDelete: () => void;
}

export function ProgramDangerZone({
  program,
  isToggling,
  onToggleStatus,
  onDelete,
}: ProgramDangerZoneProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Toggle active status */}
      <div className="flex items-center justify-between border-b px-5 py-4 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Program Status
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {program.isActive
              ? "This program is currently visible to users."
              : "This program is hidden from users."}
          </p>
        </div>
        <button
          onClick={onToggleStatus}
          disabled={isToggling}
          className="flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {program.isActive ? (
            <>
              <ToggleRight className="h-8 w-8 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Active</span>
            </>
          ) : (
            <>
              <ToggleLeft className="h-8 w-8 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">Inactive</span>
            </>
          )}
        </button>
      </div>

      {/* Delete */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Permanently delete this program and all associated data.
          </p>
        </div>
        <Button variant="danger" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete Program
        </Button>
      </div>
    </div>
  );
}
