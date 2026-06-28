import { Input } from "@/components/ui/Input";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Select } from "@/components/ui/Select";
import type { MovementSlot } from "@/types/programs";
import { useProgramPreview } from "./useProgramPreview";

export function PreviewInputsBar({ slots }: { slots: MovementSlot[] }) {
  const ctx = useProgramPreview();
  if (!ctx?.enabled) return null;

  const { inputs, setInputs } = ctx;

  return (
    <div className="sticky top-0 z-20 rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 shadow-sm backdrop-blur-sm dark:border-indigo-800 dark:bg-indigo-950/80">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
        Reference 1RMs — loads auto-calculate when you edit rows, or use
        &ldquo;Recalculate loads&rdquo; on the day header to save all at once
      </p>
      <div className="flex flex-wrap items-end gap-4">
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
          label="1.25 kg plates"
          checked={inputs.has125kgPlates}
          onCheckedChange={(v) =>
            setInputs((p) => ({ ...p, has125kgPlates: v === true }))
          }
        />
        {slots.map((slot) => (
          <Select
            key={slot.id}
            id={`preview-slot-${slot.id}`}
            label={slot.label}
            className="min-w-40"
            options={[
              { value: "", label: "Default" },
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
  );
}
