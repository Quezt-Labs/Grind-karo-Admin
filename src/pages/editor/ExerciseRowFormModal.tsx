import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import { programService } from "@/services/programService";
import { exerciseService } from "@/services/exerciseService";
import type { ExerciseRow, MovementSlot } from "@/types/programs";
import { ExerciseRowFields } from "./ExerciseRowFields";
import {
  exerciseRowSchema,
  toPayload,
  getDefaultValues,
  type ExerciseRowFormData,
} from "./exerciseRowSchema";
import { showPrescriptionPropagationToasts } from "./propagatePrescriptionToast";
import { usePropagateForwardStore } from "@/store/propagateForwardStore";
import { useProgramPreview } from "./useProgramPreview";
import { autoLoadPatchForFormRow } from "@/utils/programEditorLoadSync";
import {
  PerSetPrescriptionGrid,
  defaultPerSetDrafts,
  perSetDraftToPayload,
  type PerSetDraft,
} from "./PerSetPrescriptionGrid";

export type PrescriptionStyle = "simple" | "per-set";

interface ExerciseRowFormModalProps {
  programId: string;
  dayId?: string;
  row?: ExerciseRow;
  dayExercises?: ExerciseRow[];
  movementSlots?: MovementSlot[];
  nextSortOrder?: number;
  onClose: () => void;
  onSuccess: (result?: { rowId: string; expandSets: boolean }) => void;
}

export function ExerciseRowFormModal({
  programId,
  dayId,
  row,
  dayExercises = [],
  movementSlots,
  nextSortOrder = 0,
  onClose,
  onSuccess,
}: ExerciseRowFormModalProps) {
  const isEdit = !!row;
  const propagateForward = usePropagateForwardStore((s) => s.enabled);
  const preview = useProgramPreview();
  const [prescriptionStyle, setPrescriptionStyle] =
    useState<PrescriptionStyle>("simple");
  const [perSetDrafts, setPerSetDrafts] = useState<PerSetDraft[]>(
    defaultPerSetDrafts(3),
  );

  const buildPayload = (data: ExerciseRowFormData) => {
    const base = toPayload(data);
    if (!preview?.enabled) return base;
    const autoLoad = autoLoadPatchForFormRow(
      dayExercises,
      preview.slots,
      preview.inputs,
      row?.id,
      base,
    );
    return autoLoad ? { ...base, ...autoLoad } : base;
  };

  const { data: groupedExercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: exerciseService.getAll,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExerciseRowFormData>({
    resolver: zodResolver(exerciseRowSchema) as Resolver<ExerciseRowFormData>,
    defaultValues: getDefaultValues(row, nextSortOrder),
  });

  const createMut = useMutation({
    mutationFn: async (d: ExerciseRowFormData) => {
      const payload = buildPayload(d);
      if (prescriptionStyle === "per-set" && !isEdit) {
        const created = await programService.createExerciseRow(
          programId,
          dayId!,
          {
            ...payload,
            sets: perSetDrafts.length,
            repScheme: null,
            targetRpe: null,
            loadKg: null,
            percentOneRm: null,
          },
        );
        for (let i = 0; i < perSetDrafts.length; i++) {
          await programService.createExerciseSet(
            programId,
            created.id,
            perSetDraftToPayload(i + 1, perSetDrafts[i]!),
          );
        }
        return { row: created, expandSets: true };
      }
      const created = await programService.createExerciseRow(
        programId,
        dayId!,
        payload,
      );
      return { row: created, expandSets: false };
    },
    onSuccess: (result) => {
      toast.success("Exercise added");
      onSuccess({
        rowId: result.row.id,
        expandSets: result.expandSets,
      });
    },
    onError: () => toast.error("Failed to add exercise"),
  });

  const updateMut = useMutation({
    mutationFn: (d: ExerciseRowFormData) =>
      programService.updateExerciseRow(programId, row!.id, {
        ...buildPayload(d),
        propagateForward,
      }),
    onSuccess: (result) => {
      toast.success("Exercise updated");
      showPrescriptionPropagationToasts(result.propagated);
      onSuccess();
    },
    onError: () => toast.error("Failed to update exercise"),
  });

  const isSaving = createMut.isPending || updateMut.isPending;
  const showPerSetMode = prescriptionStyle === "per-set" && !isEdit;

  function onSubmit(data: ExerciseRowFormData) {
    if (showPerSetMode && perSetDrafts.length === 0) {
      toast.error("Add at least one set");
      return;
    }
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  return (
    <FormModal
      title={isEdit ? "Edit Exercise Row" : "Add Exercise Row"}
      onClose={onClose}
      contentClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Prescription style
            </p>
            <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-600 dark:bg-gray-900/40">
              {(
                [
                  { id: "simple" as const, label: "Simple" },
                  { id: "per-set" as const, label: "Per-set (ramp)" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPrescriptionStyle(opt.id)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                    prescriptionStyle === opt.id
                      ? "bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <ExerciseRowFields
          register={register}
          control={control}
          watch={watch}
          setValue={setValue}
          errors={errors}
          groupedExercises={groupedExercises}
          movementSlots={movementSlots}
          dayExercises={dayExercises}
          currentRowId={row?.id}
          hidePrescriptionFields={showPerSetMode}
        />

        {showPerSetMode && (
          <PerSetPrescriptionGrid
            sets={perSetDrafts}
            onChange={setPerSetDrafts}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEdit ? "Update" : "Add"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
