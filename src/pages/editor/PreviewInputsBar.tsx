import { Input } from "@/components/ui/Input";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Select } from "@/components/ui/Select";
import type { MovementSlot } from "@/types/programs";
import { useProgramPreview } from "./useProgramPreview";

export function PreviewInputsBar({ slots }: { slots: MovementSlot[] }) {
  const ctx = useProgramPreview();
  if (!ctx?.enabled) return null;

  const { inputs, setInputs } = ctx;
  const hasSlots = slots.length > 0;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/80 sm:p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
        Reference 1RMs
      </p>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Input
          id="preview-squat"
          label="Squat 1RM (kg)"
          type="number"
          min={0}
          className="w-28"
          value={inputs.squat || ""}
          onChange={(e) =>
            setInputs((p) => ({
              ...p,
              squat: Number(e.target.value) || 0,
            }))
          }
        />
        <Input
          id="preview-bench"
          label="Bench 1RM (kg)"
          type="number"
          min={0}
          className="w-28"
          value={inputs.bench || ""}
          onChange={(e) =>
            setInputs((p) => ({
              ...p,
              bench: Number(e.target.value) || 0,
            }))
          }
        />
        <Input
          id="preview-deadlift"
          label="Deadlift 1RM (kg)"
          type="number"
          min={0}
          className="w-28"
          value={inputs.deadlift || ""}
          onChange={(e) =>
            setInputs((p) => ({
              ...p,
              deadlift: Number(e.target.value) || 0,
            }))
          }
        />
        <CheckboxField
          id="preview-plates"
          label="1.25 kg plates (round to 2.5 kg)"
          checked={inputs.has125kgPlates}
          onCheckedChange={(v) =>
            setInputs((p) => ({ ...p, has125kgPlates: v === true }))
          }
        />
      </div>

      {hasSlots && (
        <div className="mt-6 border-t border-indigo-200/60 pt-5 dark:border-indigo-800/60">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            Movement selection preview
          </p>
          <p className="mb-3 text-xs text-indigo-800/70 dark:text-indigo-200/70">
            Same program for every athlete — pick a variation to preview
            resolved exercise names, sets, and loads on Structure / Preview
            below. &ldquo;Default option&rdquo; uses each slot&apos;s marked
            default.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => (
              <Select
                key={slot.id}
                id={`preview-slot-${slot.id}`}
                label={slot.label}
                options={[
                  { value: "", label: "Default option" },
                  ...slot.options.map((o) => ({
                    value: o.id,
                    label: o.exerciseName,
                  })),
                ]}
                value={inputs.movementSelections[slot.id] ?? ""}
                onValueChange={(v) =>
                  setInputs((p) => {
                    const movementSelections = { ...p.movementSelections };
                    if (v) movementSelections[slot.id] = v;
                    else delete movementSelections[slot.id];
                    return { ...p, movementSelections };
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
