import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, StickyNote } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import {
  sheetsExerciseNotesService,
  sheetsSetVideoService,
} from "@/services/sheetsSetVideoService";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface UserSheetsExerciseNotesPanelProps {
  userId: string;
}

export function UserSheetsExerciseNotesPanel({
  userId,
}: UserSheetsExerciseNotesPanelProps) {
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");

  const { data: weeks = [] } = useQuery({
    queryKey: ["admin-user-sheet-weeks", userId],
    queryFn: () => sheetsSetVideoService.listSheetWeeks(userId),
  });

  const { data: notes, isLoading } = useQuery({
    queryKey: ["admin-user-sheets-exercise-notes", userId, weekFilter],
    queryFn: () =>
      sheetsExerciseNotesService.listForUser(
        userId,
        weekFilter === "all" ? undefined : weekFilter,
      ),
  });

  const visibleNotes = useMemo(
    () => (notes ?? []).filter((n) => n.notes.trim().length > 0),
    [notes],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StickyNote className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Athlete exercise notes
        </h2>
        {visibleNotes.length > 0 && (
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {visibleNotes.length}
          </span>
        )}
        {weeks.length > 0 && (
          <select
            value={weekFilter === "all" ? "all" : String(weekFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setWeekFilter(v === "all" ? "all" : Number(v));
            }}
            className="ml-auto rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">All weeks</option>
            {weeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : visibleNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          No exercise notes from the athlete yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2.5">Week / Day</th>
                  <th className="px-3 py-2.5">Exercise</th>
                  <th className="px-3 py-2.5">Note</th>
                  <th className="px-3 py-2.5">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {visibleNotes.map((note) => (
                  <tr key={note.id}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-gray-700 dark:text-gray-300">
                      W{note.weekNumber} · Day {note.dayNumber}
                      {note.completed && (
                        <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          Done
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">
                      {note.exerciseName}
                      <span className="mt-0.5 block text-[11px] font-normal text-gray-500 dark:text-gray-400">
                        {note.tabName}
                      </span>
                    </td>
                    <td className="max-w-md px-3 py-2.5 text-gray-700 dark:text-gray-300">
                      {note.notes}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(note.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface WeekFilterProps {
  weeks: number[];
  value: number | "all";
  onChange: (v: number | "all") => void;
}

export function SheetWeekFilter({ weeks, value, onChange }: WeekFilterProps) {
  if (weeks.length === 0) return null;
  return (
    <select
      value={value === "all" ? "all" : String(value)}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "all" ? "all" : Number(v));
      }}
      className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
    >
      <option value="all">All weeks</option>
      {weeks.map((w) => (
        <option key={w} value={w}>
          Week {w}
        </option>
      ))}
    </select>
  );
}

export function SheetPanelIcon() {
  return (
    <FileSpreadsheet className="h-5 w-5 text-gray-500 dark:text-gray-400" />
  );
}
