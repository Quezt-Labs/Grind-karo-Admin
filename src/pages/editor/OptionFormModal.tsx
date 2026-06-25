import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { movementSlotService } from "@/services/movementSlotService";
import { exerciseService } from "@/services/exerciseService";
import { flattenExercises } from "@/utils/exerciseLibrary";
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

  const { data: groupedExercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: exerciseService.getAll,
  });

  const exerciseOptions = (
    groupedExercises ? flattenExercises(groupedExercises) : []
  )
    .filter((e) => e.isActive)
    .map((e) => ({ value: e.id, label: `${e.name} (${e.category})` }));

  const activeExercises = groupedExercises
    ? flattenExercises(groupedExercises).filter((e) => e.isActive)
    : [];

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

  const isDefault = useWatch({ control, name: "isDefault" });

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
  function handleExerciseChange(exerciseId: string) {
    setValue("exerciseId", exerciseId);
    const ex = activeExercises.find((item) => item.id === exerciseId);
    if (ex) setValue("exerciseName", ex.name);
  }

  return (
    <FormModal
      title={isEdit ? "Edit Option" : "Add Option"}
      onClose={onClose}
      contentClassName="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          control={control}
          name="exerciseId"
          render={({ field }) => (
            <Select
              id="opt-exercise"
              label="Exercise (from library)"
              options={[
                { value: "", label: "— Manual entry —" },
                ...exerciseOptions,
              ]}
              value={field.value ?? ""}
              onValueChange={(value) => {
                field.onChange(value);
                handleExerciseChange(value);
              }}
              onBlur={field.onBlur}
            />
          )}
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
        <CheckboxField
          id="opt-default"
          label="Set as default option"
          checked={isDefault}
          onCheckedChange={(checked) => setValue("isDefault", checked)}
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
