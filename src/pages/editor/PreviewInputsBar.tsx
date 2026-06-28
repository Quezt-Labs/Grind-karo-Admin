import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Select } from "@/components/ui/Select";
import { cn } from "@/utils/cn";
import type { MovementSlot } from "@/types/programs";
import { useProgramPreview } from "./useProgramPreview";

export function PreviewInputsBar({
  slots,
  variant = "structure",
}: {
  slots: MovementSlot[];
  variant?: "structure" | "preview";
}) {
  const ctx = useProgramPreview();
  const [slotsOpen, setSlotsOpen] = useState(variant === "preview");

  if (!ctx?.enabled) return null;

  const { inputs, setInputs } = ctx;
  const hasSlots = slots.length > 0;

  return (
    <div className="sticky top-0 z-20 rounded-xl border border-indigo-200 bg-indigo-50/90 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-indigo-800 dark:bg-indigo-950/80 sm:px-4">
      <p className="mb-2 text-[11px] leading-snug text-indigo-800/90 dark:text-indigo-200/90">
        <span className="font-semibold uppercase tracking-wide">
          Reference 1RMs
        </span>
        <span className="text-indigo-700/80 dark:text-indigo-300/80">
          {" "}
          — template loads use these values. Day header →{" "}
          <strong>Recalculate loads</strong> to save all rows.
        </span>
      </p>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <Input
          id="preview-squat"
          label="Squat"
          type="number"
          min={0}
          className="w-[5.5rem] sm:w-24"
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
          label="Bench"
          type="number"
          min={0}
          className="w-[5.5rem] sm:w-24"
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
          label="Deadlift"
          type="number"
          min={0}
          className="w-[5.5rem] sm:w-24"
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
          className="pb-1"
        />
      </div>

      {hasSlots && (
        <div className="mt-2 border-t border-indigo-200/60 pt-2 dark:border-indigo-800/60">
          <button
            type="button"
            onClick={() => setSlotsOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 text-left text-[11px] font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-100"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform",
                slotsOpen && "rotate-180",
              )}
            />
            Movement slot preview
            <span className="font-normal text-indigo-600/70 dark:text-indigo-400/70">
              ({slots.length} slots — optional, for preview only)
            </span>
          </button>
          {slotsOpen && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
          )}
        </div>
      )}
    </div>
  );
}
