import type {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
} from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  CATEGORY_OPTIONS,
  LOAD_COMPUTATION_OPTIONS,
} from "./exerciseRowSchema";
import type { ExerciseRowFormData } from "./exerciseRowSchema";
import type { MovementSlot } from "@/types/programs";

interface ExerciseRowFieldsProps {
  register: UseFormRegister<ExerciseRowFormData>;
  watch: UseFormWatch<ExerciseRowFormData>;
  setValue: UseFormSetValue<ExerciseRowFormData>;
  errors: FieldErrors<ExerciseRowFormData>;
  exerciseOptions: { value: string; label: string }[];
  movementSlots?: MovementSlot[];
}

export function ExerciseRowFields({
  register,
  watch,
  setValue,
  errors,
  exerciseOptions,
  movementSlots = [],
}: ExerciseRowFieldsProps) {
  const loadComputation = watch("loadComputation");
  const slotOptions = movementSlots.map((s) => ({
    value: s.id,
    label: `${s.label} [${s.category}]`,
  }));

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

      {/* ── Movement Slot ──────────────────────────────────── */}
      {slotOptions.length > 0 && (
        <Select
          id="row-slot"
          label="Movement Slot"
          options={slotOptions}
          value={watch("movementSlotId")}
          {...register("movementSlotId")}
        />
      )}

      {/* ── Load Computation ───────────────────────────────── */}
      <Select
        id="row-load-computation"
        label="Load Computation"
        options={LOAD_COMPUTATION_OPTIONS}
        value={watch("loadComputation")}
        {...register("loadComputation")}
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
          <Input
            id="row-ref-exercise"
            label="Reference Row ID"
            placeholder="exercise-row-uuid"
            {...register("loadRefExerciseId")}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          checked={watch("hasPlateCheck") ?? false}
          onChange={(e) => setValue("hasPlateCheck", e.target.checked)}
        />
        Plate Rounding (round to nearest plate increment)
      </label>

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
