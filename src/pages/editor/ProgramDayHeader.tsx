import { Plus, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Day } from "@/types/programs";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { usePropagateForwardStore } from "@/store/propagateForwardStore";
import { programService } from "@/services/programService";
import {
  buildAutoLoadPatchesForEntireDay,
  patchesNeedPersisting,
} from "@/utils/programEditorLoadSync";
import { TreeNodeActions } from "./TreeNodeActions";
import type { ProgramDayLocation } from "./programStructureUtils";
import { useProgramPreview } from "./useProgramPreview";

export interface ProgramDayHeaderProps {
  programId: string;
  selection: ProgramDayLocation;
  weekRangeLabel: string | null;
  nextSortOrder: number;
  onEditDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  onAddExercise: (
    dayId: string,
    dayExercises: Day["exercises"],
    nextSortOrder: number,
  ) => void;
  onRefresh: () => void;
}

export function ProgramDayHeader({
  programId,
  selection,
  weekRangeLabel,
  nextSortOrder,
  onEditDay,
  onDeleteDay,
  onAddExercise,
  onRefresh,
}: ProgramDayHeaderProps) {
  const { week, day } = selection;
  const preview = useProgramPreview();
  const propagateForward = usePropagateForwardStore((s) => s.enabled);
  const setPropagateForward = usePropagateForwardStore((s) => s.setEnabled);

  const recalcMut = useMutation({
    mutationFn: async () => {
      if (!preview?.enabled) {
        throw new Error("Load preview is not available on this tab");
      }
      const patches = buildAutoLoadPatchesForEntireDay(
        day.exercises,
        preview.slots,
        preview.inputs,
      );
      const updates = patchesNeedPersisting(day.exercises, patches);
      for (const { rowId, patch } of updates) {
        await programService.updateExerciseRow(programId, rowId, patch);
      }
      return updates.length;
    },
    onSuccess: (count) => {
      toast.success(
        count > 0
          ? `Recalculated template loads for ${count} exercise(s)`
          : "Template loads are already up to date",
      );
      onRefresh();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to recalculate loads",
      );
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
      <div className="min-w-0 w-full flex-1 sm:w-auto">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          {week.title}
          {weekRangeLabel ? ` · ${weekRangeLabel}` : ""}
        </p>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {day.title}
        </h3>
        {day.focus && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {day.focus}
          </p>
        )}
      </div>
      <CheckboxField
        id="propagate-forward"
        label="Apply to later weeks"
        description="Sets, reps, RPE, and % in this block"
        checked={propagateForward}
        onCheckedChange={setPropagateForward}
        className="w-full shrink-0 sm:w-auto sm:max-w-[14rem]"
        labelClassName="text-xs"
      />
      {preview?.enabled && day.exercises.length > 0 && (
        <Button
          size="sm"
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={recalcMut.isPending}
          isLoading={recalcMut.isPending}
          onClick={() => recalcMut.mutate()}
          title="Save template loads for every row using reference 1RMs above"
        >
          {!recalcMut.isPending && <RefreshCw className="h-4 w-4" />}
          Recalculate loads
        </Button>
      )}
      <TreeNodeActions
        onEdit={() => onEditDay(day)}
        editTitle="Edit day"
        onDelete={() => onDeleteDay(day)}
        deleteTitle="Delete day"
        size="md"
      />
      <Button
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => onAddExercise(day.id, day.exercises, nextSortOrder)}
      >
        <Plus className="h-4 w-4" />
        Add exercise
      </Button>
    </div>
  );
}
