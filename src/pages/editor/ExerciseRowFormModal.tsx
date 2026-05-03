import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { programService } from "@/services/programService";
import { exerciseService } from "@/services/exerciseService";
import type { ExerciseRow } from "@/types/programs";
import { ExerciseRowFields } from "./ExerciseRowFields";
import {
  exerciseRowSchema,
  toPayload,
  getDefaultValues,
  type ExerciseRowFormData,
} from "./exerciseRowSchema";

interface ExerciseRowFormModalProps {
  programId: string;
  dayId?: string;
  row?: ExerciseRow;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExerciseRowFormModal({
  programId,
  dayId,
  row,
  onClose,
  onSuccess,
}: ExerciseRowFormModalProps) {
  const isEdit = !!row;

  const { data: exercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: exerciseService.getAll,
  });

  const exerciseOptions = (exercises ?? [])
    .filter((e) => e.isActive)
    .map((e) => ({ value: e.id, label: `${e.name} (${e.category})` }));

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ExerciseRowFormData>({
    resolver: zodResolver(exerciseRowSchema) as Resolver<ExerciseRowFormData>,
    defaultValues: getDefaultValues(row),
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
      programService.updateExerciseRow(programId, row!.id, toPayload(d)),
    onSuccess: () => {
      toast.success("Exercise updated");
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: ExerciseRowFormData) {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Exercise Row" : "Add Exercise Row"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ExerciseRowFields
            register={register}
            watch={watch}
            errors={errors}
            exerciseOptions={exerciseOptions}
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
      </div>
    </div>
  );
}
