import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import { programService } from "@/services/programService";
import { exerciseService } from "@/services/exerciseService";
import { flattenExercises } from "@/utils/exerciseLibrary";
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

interface ExerciseRowFormModalProps {
  programId: string;
  dayId?: string;
  row?: ExerciseRow;
  dayExercises?: ExerciseRow[];
  movementSlots?: MovementSlot[];
  nextSortOrder?: number;
  onClose: () => void;
  onSuccess: () => void;
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

  const { data: groupedExercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: exerciseService.getAll,
  });

  const exerciseOptions = (
    groupedExercises ? flattenExercises(groupedExercises) : []
  )
    .filter((e) => e.isActive)
    .map((e) => ({ value: e.id, label: `${e.name} (${e.category})` }));

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
    mutationFn: (d: ExerciseRowFormData) =>
      programService.createExerciseRow(programId, dayId!, toPayload(d)),
    onSuccess: () => {
      toast.success("Exercise added");
      onSuccess();
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: ExerciseRowFormData) =>
      programService.updateExerciseRow(programId, row!.id, {
        ...toPayload(d),
        propagateForward,
      }),
    onSuccess: (result) => {
      toast.success("Exercise updated");
      showPrescriptionPropagationToasts(result.propagated);
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: ExerciseRowFormData) {
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
        <ExerciseRowFields
          register={register}
          control={control}
          watch={watch}
          setValue={setValue}
          errors={errors}
          exerciseOptions={exerciseOptions}
          movementSlots={movementSlots}
          dayExercises={dayExercises}
          currentRowId={row?.id}
        />

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
