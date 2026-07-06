import {
  Controller,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
  type FieldErrors,
} from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ExerciseLibraryPicker } from "@/components/programs/ExerciseLibraryPicker";
import {
  CATEGORY_OPTIONS,
  LOAD_COMPUTATION_OPTIONS,
} from "./exerciseRowSchema";
import type { ExerciseRowFormData } from "./exerciseRowSchema";
import type {
  ExerciseRow,
  ExercisesGrouped,
  MovementSlot,
} from "@/types/programs";

interface ExerciseRowFieldsProps {
  register: UseFormRegister<ExerciseRowFormData>;
  control: Control<ExerciseRowFormData>;
  watch: UseFormWatch<ExerciseRowFormData>;
  setValue: UseFormSetValue<ExerciseRowFormData>;
  errors: FieldErrors<ExerciseRowFormData>;
  groupedExercises?: ExercisesGrouped;
  movementSlots?: MovementSlot[];
  dayExercises?: ExerciseRow[];
  currentRowId?: string;
  hidePrescriptionFields?: boolean;
}

export function ExerciseRowFields({
  register,
  control,
  watch,
  setValue,
  errors,
  groupedExercises,
  movementSlots = [],
  dayExercises = [],
  currentRowId,
  hidePrescriptionFields = false,
}: ExerciseRowFieldsProps) {
  const loadComputation = watch("loadComputation");
  const exerciseId = watch("exerciseId");
  const hasLibraryExercise = Boolean(exerciseId);
  const slotOptions = movementSlots.map((s) => ({
    value: s.id,
    label: `${s.label} [${s.category}]`,
  }));

  const refRowOptions = dayExercises
    .filter((r) => r.id !== currentRowId)
    .map((r, i) => ({
      value: r.id,
      label: `${i + 1}. ${r.resolvedName || r.exerciseNameOverride || "Exercise"}`,
    }));

  return (
    <>
      <Controller
        control={control}
        name="category"
        render={({ field }) => (
          <Select
            id="row-category"
            label="Category"
            options={CATEGORY_OPTIONS}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.category?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="exerciseId"
        render={({ field }) => (
          <ExerciseLibraryPicker
            id="row-exercise"
            label="Exercise (from library)"
            labelInfo="Exercise library se pick karo jab ek clear movement ho. Slash/combo options (jaise Lunges/BSS) ke liye neeche manual name likho."
            groupedExercises={groupedExercises}
            value={field.value ?? ""}
            onValueChange={(next) => {
              field.onChange(next);
              if (next) setValue("exerciseNameOverride", "");
            }}
            onExercisePick={(exercise) => {
              setValue("category", exercise.category);
            }}
            onBlur={field.onBlur}
            placeholder="Search squat, bench, deadlift…"
          />
        )}
      />

      {!hasLibraryExercise && (
        <>
          <Input
            id="row-override"
            label="Exercise Name (Manual)"
            placeholder="e.g. Lunges / BSS / Leg Press"
            {...register("exerciseNameOverride")}
          />
          <p className="-mt-2 text-xs text-gray-400">
            Library se select karo ya manually name likho — dono mein se ek hi
            chahiye
          </p>
        </>
      )}

      {!hidePrescriptionFields && (
        <>
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

          <div className="grid gap-4 sm:grid-cols-3">
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
              id="row-load-kg"
              label="Load (kg)"
              type="number"
              min={0}
              step={0.5}
              placeholder="60"
              {...register("loadKg")}
            />
            <Input
              id="row-order"
              label="Sort Order"
              type="number"
              min={0}
              {...register("sortOrder")}
            />
          </div>
        </>
      )}

      {hidePrescriptionFields && (
        <Input
          id="row-order"
          label="Sort Order"
          type="number"
          min={0}
          {...register("sortOrder")}
        />
      )}

      {slotOptions.length > 0 && (
        <Controller
          control={control}
          name="movementSlotId"
          render={({ field }) => (
            <Select
              id="row-slot"
              label="Movement Slot"
              options={[{ value: "", label: "— None —" }, ...slotOptions]}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      )}

      <Controller
        control={control}
        name="loadComputation"
        render={({ field }) => (
          <Select
            id="row-load-computation"
            label="Load Computation"
            labelInfo="Kaunsi strategy se athlete ka working weight calculate hoga."
            options={LOAD_COMPUTATION_OPTIONS}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.loadComputation?.message}
          />
        )}
      />

      {loadComputation === "PERCENT_OF_ROW" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="row-ref-factor"
            label="Reference Factor"
            type="number"
            step={0.01}
            min={0}
            max={2}
            placeholder="0.90"
            {...register("loadRefFactor")}
          />
          <Controller
            control={control}
            name="loadRefExerciseId"
            render={({ field }) => (
              <Select
                id="row-ref-exercise"
                label="Reference exercise (top set row)"
                options={[
                  { value: "", label: "— Select row —" },
                  ...refRowOptions,
                ]}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
      )}

      <Controller
        control={control}
        name="hasPlateCheck"
        render={({ field }) => (
          <CheckboxField
            id="row-plate-check"
            label="Plate Rounding (round to nearest plate increment)"
            checked={field.value ?? false}
            onCheckedChange={field.onChange}
          />
        )}
      />

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
