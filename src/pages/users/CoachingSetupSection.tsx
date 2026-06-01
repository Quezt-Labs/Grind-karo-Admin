import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Eye, Link2 } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { coachingSetupColumns } from "./coachingSetupColumns";
import type { CoachingSetupRow } from "./usersConstants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import type { CoachingSetupStatusFilter } from "@/types/user";

type Props = {
  rows: CoachingSetupRow[];
  isLoading: boolean;
  isError: boolean;
  statusFilter: CoachingSetupStatusFilter;
  onStatusFilterChange: (value: CoachingSetupStatusFilter) => void;
  counts?: {
    needsIntake: number;
    awaitingSheet: number;
    ready: number;
  };
};

export const CoachingSetupSection = memo(function CoachingSetupSection({
  rows,
  isLoading,
  isError,
  statusFilter,
  onStatusFilterChange,
  counts,
}: Props) {
  const navigate = useNavigate();

  const actionsColumn = {
    key: "id" as keyof CoachingSetupRow & string,
    header: "Actions",
    render: (
      _value: CoachingSetupRow[keyof CoachingSetupRow],
      row: CoachingSetupRow,
    ) => (
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate(`/users/${row.id}`)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Open user — link sheet"
        >
          {row.setupStatus === "awaiting_sheet" ? (
            <Link2 className="h-4 w-4 text-amber-600" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    ),
  };

  if (isError) {
    return (
      <ErrorAlert message="Failed to load coaching setup queue. Please try again later." />
    );
  }

  if (!isLoading && rows.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <StatusFilter value={statusFilter} onChange={onStatusFilterChange} />
        </div>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
            <ClipboardList className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No athletes in this queue
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {statusFilter === "awaiting_sheet"
              ? "Everyone with active coaching has a linked sheet — nice work."
              : "Try a different status filter or check back after a new subscription."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {counts && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Awaiting sheet: {counts.awaitingSheet}
          </span>
          <span className="rounded-full bg-orange-100 px-2.5 py-1 font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            Needs intake: {counts.needsIntake}
          </span>
          <span className="rounded-full bg-green-100 px-2.5 py-1 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Ready: {counts.ready}
          </span>
        </div>
      )}
      <div className="flex justify-end">
        <StatusFilter value={statusFilter} onChange={onStatusFilterChange} />
      </div>
      <DataTable
        data={rows}
        columns={[...coachingSetupColumns, actionsColumn]}
        isLoading={isLoading}
      />
    </div>
  );
});

function StatusFilter({
  value,
  onChange,
}: {
  value: CoachingSetupStatusFilter;
  onChange: (value: CoachingSetupStatusFilter) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as CoachingSetupStatusFilter)}
    >
      <SelectTrigger className="h-9 w-44 rounded-lg border border-gray-300 bg-white text-sm dark:border-gray-600 dark:bg-gray-800">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="awaiting_sheet">Awaiting sheet</SelectItem>
        <SelectItem value="needs_intake">Needs intake</SelectItem>
        <SelectItem value="ready">Ready</SelectItem>
        <SelectItem value="all">All active coaching</SelectItem>
      </SelectContent>
    </Select>
  );
}
