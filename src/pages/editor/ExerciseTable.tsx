import { memo, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Dumbbell, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ShadTable";
import type { ExerciseRow } from "@/types/programs";
import { programService } from "@/services/programService";
import { SortableExerciseTableRow } from "./SortableExerciseTableRow";
import { buildPriorWeekColumns } from "./programWeekHistory";
import type { WeekTree } from "./programStructureUtils";
import { sortDayExercises } from "@/utils/exerciseSortOrder";
import { detectDuplicateExerciseGroups } from "./detectDuplicateExerciseGroups";
import { MergeExerciseRowsModal } from "./MergeExerciseRowsModal";

interface ExerciseTableProps {
  programId: string;
  dayId: string;
  exercises: ExerciseRow[];
  compact?: boolean;
  blockWeeks?: WeekTree[];
  currentWeekNumber?: number;
  dayNumber?: number;
  onAddExercise: () => void;
  onEditExercise: (
    row: ExerciseRow,
    dayId: string,
    dayExercises: ExerciseRow[],
  ) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
  onRefresh: () => void;
  expandExerciseRowId?: string | null;
  onExpandConsumed?: () => void;
}

export const ExerciseTable = memo(function ExerciseTable({
  programId,
  dayId,
  exercises,
  compact = false,
  blockWeeks,
  currentWeekNumber,
  dayNumber,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onRefresh,
  expandExerciseRowId,
  onExpandConsumed,
}: ExerciseTableProps) {
  const cellPy = compact ? "py-1.5" : "py-3";
  const headPy = compact ? "py-1.5" : "py-3";
  const textSize = compact ? "text-xs" : "text-sm";

  const priorWeekColumns = useMemo(() => {
    if (!blockWeeks?.length || currentWeekNumber == null) return [];
    return buildPriorWeekColumns(blockWeeks, currentWeekNumber);
  }, [blockWeeks, currentWeekNumber]);

  const showWeekHistory =
    priorWeekColumns.length > 0 && dayNumber != null && !compact;
  const baseColSpan = compact ? 8 : 9;
  const colSpan = baseColSpan + (showWeekHistory ? priorWeekColumns.length : 0);
  const minTableWidth = showWeekHistory
    ? `${42 + priorWeekColumns.length * 4.5}rem`
    : "40rem";

  const historyHeadClass =
    "bg-slate-100/90 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400";
  const currentHeadClass =
    "border-l-2 border-l-primary-200 bg-white/80 dark:border-l-primary-800 dark:bg-gray-800/80";

  const sortedFromProps = useMemo(
    () => sortDayExercises(exercises),
    [exercises],
  );

  const [orderedRows, setOrderedRows] = useState(sortedFromProps);
  const [mergeGroup, setMergeGroup] = useState<{
    rowIds: string[];
  } | null>(null);

  const duplicateGroups = useMemo(
    () => detectDuplicateExerciseGroups(exercises),
    [exercises],
  );

  useEffect(() => {
    setOrderedRows(sortedFromProps);
  }, [sortedFromProps]);

  useEffect(() => {
    if (
      expandExerciseRowId &&
      orderedRows.some((r) => r.id === expandExerciseRowId)
    ) {
      onExpandConsumed?.();
    }
  }, [expandExerciseRowId, orderedRows, onExpandConsumed]);

  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) =>
      programService.reorderDayExercises(programId, dayId, orderedIds),
    onSuccess: () => {
      onRefresh();
    },
    onError: () => {
      toast.error("Failed to reorder exercises");
      setOrderedRows(sortedFromProps);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || reorderMut.isPending) return;

    const oldIndex = orderedRows.findIndex((row) => row.id === active.id);
    const newIndex = orderedRows.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(orderedRows, oldIndex, newIndex);
    setOrderedRows(next);
    reorderMut.mutate(next.map((row) => row.id));
  }

  const sortableIds = orderedRows.map((row) => row.id);
  const dragDisabled = reorderMut.isPending || orderedRows.length < 2;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {duplicateGroups.length > 0 && !compact && (
        <div className="border-b border-amber-200 bg-amber-50/80 px-3 py-2.5 dark:border-amber-800/50 dark:bg-amber-950/20 sm:px-4">
          {duplicateGroups.map((group) => (
            <div
              key={group.rowIds.join("-")}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <p className="text-xs text-amber-900 dark:text-amber-200">
                <strong>{group.rowIds.length} similar</strong>{" "}
                <span className="font-medium">{group.displayName}</span> rows —
                merge into one exercise with per-set prescription?
              </p>
              <button
                type="button"
                onClick={() => setMergeGroup({ rowIds: group.rowIds })}
                className="shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
              >
                Merge
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <Table className={cn(textSize)} style={{ minWidth: minTableWidth }}>
              <TableHeader>
                {showWeekHistory ? (
                  <>
                    <TableRow className="sticky top-0 z-10 border-b-0 bg-gray-50/95 backdrop-blur-sm dark:bg-gray-800/95">
                      <TableHead
                        rowSpan={2}
                        className={cn(
                          "h-auto w-10 border-b border-gray-200 pl-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400",
                          headPy,
                        )}
                        title="Drag to reorder"
                      >
                        #
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className={cn(
                          "h-auto min-w-36 border-b border-gray-200 pl-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400",
                          headPy,
                        )}
                      >
                        Exercise
                      </TableHead>
                      <TableHead
                        colSpan={priorWeekColumns.length}
                        className={cn(
                          "h-auto border-b border-gray-200 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide",
                          historyHeadClass,
                          "border-gray-200 dark:border-gray-600",
                        )}
                      >
                        Prior weeks
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className={cn(
                          "h-auto w-8 border-b border-gray-200 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400",
                          headPy,
                        )}
                        title="Category"
                      >
                        C
                      </TableHead>
                      <TableHead
                        colSpan={5}
                        className={cn(
                          "h-auto border-b border-l-2 border-gray-200 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-primary-700 dark:border-gray-600 dark:text-primary-400",
                          currentHeadClass,
                        )}
                      >
                        This week
                      </TableHead>
                      <TableHead
                        rowSpan={2}
                        className={cn(
                          "h-auto w-14 border-b border-gray-200 text-center dark:border-gray-600",
                          headPy,
                        )}
                      />
                    </TableRow>
                    <TableRow className="sticky top-[2.125rem] z-10 border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm dark:border-gray-600 dark:bg-gray-800/95">
                      {priorWeekColumns.map((col, i) => (
                        <TableHead
                          key={col.weekNumber}
                          className={cn(
                            "h-auto w-[4.25rem] min-w-[4.25rem] border-b-0 px-1 py-1.5 text-center text-[10px] font-bold tabular-nums",
                            historyHeadClass,
                            i === priorWeekColumns.length - 1 &&
                              "border-r-2 border-r-slate-200 dark:border-r-slate-600",
                          )}
                          title={`Week ${col.weekNumber} · same day, slot ${dayNumber}`}
                        >
                          {col.label}
                        </TableHead>
                      ))}
                      {(["Sets", "Reps", "RPE", "%", "Load"] as const).map(
                        (label, i) => (
                          <TableHead
                            key={label}
                            className={cn(
                              "h-auto border-b-0 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide",
                              i === 0 && currentHeadClass,
                              label === "Load"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-gray-500 dark:text-gray-400",
                              label === "Sets" && "w-12",
                              label === "Reps" && "w-16",
                            )}
                          >
                            {label}
                          </TableHead>
                        ),
                      )}
                    </TableRow>
                  </>
                ) : (
                  <TableRow className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm hover:bg-gray-50/95 dark:border-gray-600 dark:bg-gray-800/95 dark:hover:bg-gray-800/95">
                    <TableHead
                      className={cn(
                        "h-auto w-10 border-b-0 pl-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                        headPy,
                      )}
                      title="Drag to reorder"
                    >
                      #
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-auto min-w-36 border-b-0 pl-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                        headPy,
                      )}
                    >
                      Exercise
                    </TableHead>
                    {!compact && (
                      <TableHead
                        className={cn(
                          "h-auto w-8 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                          headPy,
                        )}
                        title="Category"
                      >
                        C
                      </TableHead>
                    )}
                    <TableHead
                      className={cn(
                        "h-auto w-12 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                        headPy,
                      )}
                    >
                      Sets
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-auto w-16 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                        headPy,
                      )}
                    >
                      Reps
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-auto w-12 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                        headPy,
                      )}
                    >
                      RPE
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-auto w-12 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                        headPy,
                      )}
                    >
                      %
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-auto w-16 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400",
                        headPy,
                      )}
                    >
                      Load
                    </TableHead>
                    <TableHead
                      className={cn(
                        "h-auto w-14 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                        headPy,
                      )}
                    />
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {orderedRows.length === 0 && (
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                    <TableCell colSpan={colSpan} className="py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Dumbbell className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                        <p className="text-[10px] text-gray-400">
                          No exercises
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {orderedRows.map((row, i) => (
                  <SortableExerciseTableRow
                    key={row.id}
                    programId={programId}
                    row={row}
                    dayExercises={orderedRows}
                    index={i}
                    compact={compact}
                    cellPy={cellPy}
                    blockWeeks={showWeekHistory ? blockWeeks : undefined}
                    dayNumber={showWeekHistory ? dayNumber : undefined}
                    priorWeekColumns={
                      showWeekHistory ? priorWeekColumns : undefined
                    }
                    tableColSpan={colSpan}
                    disabled={dragDisabled}
                    forceExpanded={expandExerciseRowId === row.id}
                    onEdit={() => onEditExercise(row, dayId, exercises)}
                    onDelete={() => onDeleteExercise(row)}
                    onRefresh={onRefresh}
                  />
                ))}
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                  <TableCell colSpan={colSpan} className="py-3">
                    <button
                      type="button"
                      onClick={onAddExercise}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-primary-600 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-gray-600 dark:text-primary-400 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
                    >
                      <Plus className="h-4 w-4" />
                      Add Exercise
                    </button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </div>

      {mergeGroup && (
        <MergeExerciseRowsModal
          programId={programId}
          rows={orderedRows.filter((r) => mergeGroup.rowIds.includes(r.id))}
          onClose={() => setMergeGroup(null)}
          onSuccess={() => {
            setMergeGroup(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
});
