import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { movementSlotService } from "@/services/movementSlotService";
import { exerciseService } from "@/services/exerciseService";
import type { MovementOption } from "@/types/programs";

const schema = z.object({
  exerciseId: z.string().optional(),
  exerciseName: z.string().min(1, "Exercise name is required"),
  isDefault: z.boolean(),
  sortOrder: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface OptionFormModalProps {
  slotId: string;
  option?: MovementOption;
  onClose: () => void;
  onSuccess: () => void;
}

export function OptionFormModal({
  slotId,
  option,
  onClose,
  onSuccess,
}: OptionFormModalProps) {
  const isEdit = !!option;

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
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: option
      ? {
          exerciseId: option.exerciseId || "",
          exerciseName: option.exerciseName,
          isDefault: option.isDefault,
          sortOrder: option.sortOrder,
        }
      : { exerciseId: "", exerciseName: "", isDefault: false, sortOrder: 0 },
  });

  const exerciseId = useWatch({ control, name: "exerciseId" });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      movementSlotService.createOption(slotId, {
        exerciseId: d.exerciseId || null,
        exerciseName: d.exerciseName,
        isDefault: d.isDefault,
        sortOrder: d.sortOrder,
      }),
    onSuccess: () => {
      toast.success("Option added");
      onSuccess();
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      movementSlotService.updateOption(option!.id, {
        exerciseId: d.exerciseId || null,
        exerciseName: d.exerciseName,
        isDefault: d.isDefault,
        sortOrder: d.sortOrder,
      }),
    onSuccess: () => {
      toast.success("Option updated");
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: FormData) {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  // Auto-fill exercise name when selecting from library
  function handleExerciseChange(e: {
    target: { value: string; name: string };
  }) {
    const id = e.target.value;
    register("exerciseId").onChange(e);
    const ex = (exercises ?? []).find((ex) => ex.id === id);
    if (ex) setValue("exerciseName", ex.name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Option" : "Add Option"}
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
            id="opt-exercise"
            label="Exercise (from library)"
            options={exerciseOptions}
            value={exerciseId}
            onChange={handleExerciseChange}
          />
          <Input
            id="opt-name"
            label="Exercise Name"
            placeholder="High Bar Squat"
            error={errors.exerciseName?.message}
            {...register("exerciseName")}
          />
          <Input
            id="opt-order"
            label="Sort Order"
            type="number"
            min={0}
            {...register("sortOrder")}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={watch("isDefault")}
              onChange={(e) => setValue("isDefault", e.target.checked)}
            />
            Set as default option
          </label>
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
