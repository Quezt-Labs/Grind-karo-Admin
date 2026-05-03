import type {
  UseFormRegister,
  UseFormWatch,
  FieldErrors,
} from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { CATEGORY_OPTIONS } from "./exerciseRowSchema";
import type { ExerciseRowFormData } from "./exerciseRowSchema";

interface ExerciseRowFieldsProps {
  register: UseFormRegister<ExerciseRowFormData>;
  watch: UseFormWatch<ExerciseRowFormData>;
  errors: FieldErrors<ExerciseRowFormData>;
  exerciseOptions: { value: string; label: string }[];
}

export function ExerciseRowFields({
  register,
  watch,
  errors,
  exerciseOptions,
}: ExerciseRowFieldsProps) {
  return (
    <>
      <Select
        id="row-category"
        label="Category"
        options={CATEGORY_OPTIONS}
        error={errors.category?.message}
        value={watch("category")}
        {...register("category")}
      />

      <Select
        id="row-exercise"
        label="Exercise (from library)"
        options={exerciseOptions}
        value={watch("exerciseId")}
        {...register("exerciseId")}
      />

      <Input
        id="row-override"
        label="Exercise Name (Manual)"
        placeholder="e.g. Lunges / BSS / Leg Press"
        {...register("exerciseNameOverride")}
      />
      <p className="text-xs text-gray-400 -mt-2">
        Library se select karo ya manually name likho — dono mein se ek hi
        chahiye
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
          label="% of 1RM"
          type="number"
          min={0}
          max={100}
          step={0.5}
          placeholder="53"
          {...register("percentOneRmDisplay")}
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
      <Textarea id="row-notes" label="Notes" rows={2} {...register("notes")} />
    </>
  );
}
