import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, StickyNote, Video } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ShadTable";
import { Select } from "@/components/ui/Select";
import {
  sheetsExerciseNotesService,
  sheetsSetVideoService,
  type AdminSheetsExerciseNote,
} from "@/services/sheetsSetVideoService";
import { findVideosForNote } from "@/lib/sheetTabMatch";
import {
  activityScopeKey,
  type UserActivityScope,
} from "@/utils/userActivityScope";

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
  activityScope?: UserActivityScope;
  onOpenVideos?: (opts: {
    weekNumber: number;
    reviewFilter: "all" | "unreviewed";
  }) => void;
}

export function UserSheetsExerciseNotesPanel({
  userId,
  activityScope = { mode: "all" },
  onOpenVideos,
}: UserSheetsExerciseNotesPanelProps) {
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const scopeKey = activityScopeKey(activityScope);
  const subscriptionId =
    activityScope.mode === "subscription"
      ? activityScope.subscriptionId
      : undefined;

  const { data: weeks = [] } = useQuery({
    queryKey: ["admin-user-sheet-weeks", userId, scopeKey],
    queryFn: () => sheetsSetVideoService.listSheetWeeks(userId, subscriptionId),
  });

  const { data: notes, isLoading } = useQuery({
    queryKey: [
      "admin-user-sheets-exercise-notes",
      userId,
      weekFilter,
      scopeKey,
    ],
    queryFn: () =>
      sheetsExerciseNotesService.listForUser(userId, {
        weekNumber: weekFilter === "all" ? undefined : weekFilter,
        subscriptionId,
      }),
  });

  const { data: allVideos = [] } = useQuery({
    queryKey: ["admin-user-sheets-set-videos-all", userId, scopeKey],
    queryFn: () =>
      sheetsSetVideoService.listForUser(userId, { subscriptionId }),
    enabled: Boolean(onOpenVideos),
  });

  const visibleNotes = useMemo(
    () => (notes ?? []).filter((n) => n.notes.trim().length > 0),
    [notes],
  );

  const videoCountByNoteId = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of visibleNotes) {
      map.set(note.id, findVideosForNote(note, allVideos).length);
    }
    return map;
  }, [allVideos, visibleNotes]);

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
          <div className="ml-auto">
            <SheetWeekFilter
              weeks={weeks}
              value={weekFilter}
              onChange={setWeekFilter}
            />
          </div>
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
          <Table className="min-w-full text-left text-sm">
            <TableHeader className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
              <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="h-auto px-3 py-2.5">Week / Day</TableHead>
                <TableHead className="h-auto px-3 py-2.5">Exercise</TableHead>
                <TableHead className="h-auto px-3 py-2.5">Note</TableHead>
                <TableHead className="h-auto px-3 py-2.5">Updated</TableHead>
                {onOpenVideos ? (
                  <TableHead className="h-auto px-3 py-2.5">Video</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  videoCount={videoCountByNoteId.get(note.id) ?? 0}
                  onOpenVideos={onOpenVideos}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function NoteRow({
  note,
  videoCount,
  onOpenVideos,
}: {
  note: AdminSheetsExerciseNote;
  videoCount: number;
  onOpenVideos?: (opts: {
    weekNumber: number;
    reviewFilter: "all" | "unreviewed";
  }) => void;
}) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap px-3 py-2.5 text-gray-700 dark:text-gray-300">
        W{note.weekNumber} · Day {note.dayNumber}
        {note.completed && (
          <span className="ml-1.5 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Done
          </span>
        )}
      </TableCell>
      <TableCell className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">
        {note.exerciseName}
        <span className="mt-0.5 block text-[11px] font-normal text-gray-500 dark:text-gray-400">
          {note.tabName}
          {note.category ? ` · ${note.category}` : ""}
          {note.sortOrder > 0 ? ` · #${note.sortOrder}` : ""}
        </span>
      </TableCell>
      <TableCell className="max-w-md px-3 py-2.5 text-gray-700 dark:text-gray-300">
        {note.notes}
      </TableCell>
      <TableCell className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
        {formatDateTime(note.updatedAt)}
      </TableCell>
      {onOpenVideos ? (
        <TableCell className="whitespace-nowrap px-3 py-2.5">
          {videoCount > 0 ? (
            <button
              type="button"
              onClick={() =>
                onOpenVideos({
                  weekNumber: note.weekNumber,
                  reviewFilter: "all",
                })
              }
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
            >
              <Video className="h-3 w-3" />
              {videoCount === 1 ? "Open video" : `${videoCount} videos`}
            </button>
          ) : (
            <span className="text-[11px] text-gray-400">No video</span>
          )}
        </TableCell>
      ) : null}
    </TableRow>
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
    <Select
      className="h-8 w-32 text-xs"
      options={[
        { value: "all", label: "All weeks" },
        ...weeks.map((w) => ({ value: String(w), label: `Week ${w}` })),
      ]}
      value={value === "all" ? "all" : String(value)}
      onValueChange={(v) => onChange(v === "all" ? "all" : Number(v))}
    />
  );
}

export function SheetPanelIcon() {
  return (
    <FileSpreadsheet className="h-5 w-5 text-gray-500 dark:text-gray-400" />
  );
}
