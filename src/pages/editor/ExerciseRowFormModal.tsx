import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { programService } from "@/services/programService";
import { exerciseService } from "@/services/exerciseService";
import type { ExerciseRow } from "@/types/programs";

const CATEGORY_OPTIONS = [
  { value: "SQUAT", label: "Squat" },
  { value: "BENCH", label: "Bench" },
  { value: "DEADLIFT", label: "Deadlift" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "OTHER", label: "Other" },
];

const schema = z.object({
  sortOrder: z.coerce.number().min(0),
  category: z.enum(["SQUAT", "BENCH", "DEADLIFT", "ACCESSORY", "OTHER"]),
  exerciseId: z.string().optional(),
  exerciseNameOverride: z.string().optional(),
  sets: z.coerce.number().nullable().optional(),
  repScheme: z.string().optional(),
  targetRpe: z.string().optional(),
  percentOneRm: z.coerce.number().nullable().optional(),
  loadNote: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

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
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: row
      ? {
          sortOrder: row.sortOrder,
          category: row.category,
          exerciseId: row.exerciseId || "",
          exerciseNameOverride: row.exerciseNameOverride || "",
          sets: row.sets,
          repScheme: row.repScheme || "",
          targetRpe: row.targetRpe || "",
          percentOneRm: row.percentOneRm,
          loadNote: row.loadNote || "",
          notes: row.notes || "",
        }
      : {
          sortOrder: 0,
          category: "ACCESSORY",
          exerciseId: "",
          exerciseNameOverride: "",
          sets: null,
          repScheme: "",
          targetRpe: "",
          percentOneRm: null,
          loadNote: "",
          notes: "",
        },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.createExerciseRow(programId, dayId!, {
        sortOrder: d.sortOrder,
        category: d.category,
        exerciseId: d.exerciseId || null,
        exerciseNameOverride: d.exerciseNameOverride || null,
        sets: d.sets || null,
        repScheme: d.repScheme || null,
        targetRpe: d.targetRpe || null,
        percentOneRm: d.percentOneRm || null,
        loadNote: d.loadNote || null,
        notes: d.notes || null,
      }),
    onSuccess: () => {
      toast.success("Exercise added");
      onSuccess();
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.updateExerciseRow(programId, row!.id, {
        sortOrder: d.sortOrder,
        category: d.category,
        exerciseId: d.exerciseId || null,
        exerciseNameOverride: d.exerciseNameOverride || null,
        sets: d.sets || null,
        repScheme: d.repScheme || null,
        targetRpe: d.targetRpe || null,
        percentOneRm: d.percentOneRm || null,
        loadNote: d.loadNote || null,
        notes: d.notes || null,
      }),
    onSuccess: () => {
      toast.success("Exercise updated");
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: FormData) {
    isEdit ? updateMut.mutate(data) : createMut.mutate(data);
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
          <Select
            id="row-category"
            label="Category"
            options={CATEGORY_OPTIONS}
            error={errors.category?.message}
            {...register("category")}
          />

          <Select
            id="row-exercise"
            label="Exercise (from library)"
            options={exerciseOptions}
            {...register("exerciseId")}
          />

          <Input
            id="row-override"
            label="Exercise Name Override"
            placeholder="lunges/bss/leg press"
            {...register("exerciseNameOverride")}
          />
          <p className="text-xs text-gray-400 -mt-2">
            Use when exercise doesn't map to a single library entry
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="row-sets"
              label="Sets"
              type="number"
              min={0}
              placeholder="3"
              {...register("sets")}
            />
            <Input
              id="row-reps"
              label="Rep Scheme"
              placeholder="5-8"
              {...register("repScheme")}
            />
            <Input
              id="row-rpe"
              label="Target RPE"
              placeholder="@7"
              {...register("targetRpe")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="row-pct"
              label="% of 1RM (basis points)"
              type="number"
              min={0}
              placeholder="5300 = 53%"
              {...register("percentOneRm")}
            />
            <Input
              id="row-order"
              label="Sort Order"
              type="number"
              min={0}
              {...register("sortOrder")}
            />
          </div>

          <Input
            id="row-load"
            label="Load Note"
            placeholder="ascending sets @8,9,9"
            {...register("loadNote")}
          />
          <Textarea
            id="row-notes"
            label="Notes"
            rows={2}
            {...register("notes")}
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
