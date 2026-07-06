import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { emptyPerSetDraft, type PerSetDraft } from "./perSetPrescriptionDraft";

interface PerSetPrescriptionGridProps {
  sets: PerSetDraft[];
  onChange: (sets: PerSetDraft[]) => void;
}

const INPUT_CLS =
  "w-full rounded border border-gray-200 bg-white px-1.5 py-1.5 text-center font-mono text-xs focus:border-primary-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

export function PerSetPrescriptionGrid({
  sets,
  onChange,
}: PerSetPrescriptionGridProps) {
  function updateSet(index: number, patch: Partial<PerSetDraft>) {
    onChange(sets.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSet() {
    onChange([...sets, emptyPerSetDraft()]);
  }

  function removeSet(index: number) {
    if (sets.length <= 1) return;
    onChange(sets.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Per-set prescription (ramp / top sets)
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={addSet}>
          <Plus className="h-3.5 w-3.5" />
          Add set
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
        <table className="w-full min-w-[28rem] text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/60">
              {["Set", "% 1RM", "Reps", "Scheme", "RPE", "Abs kg", ""].map(
                (h) => (
                  <th
                    key={h || "actions"}
                    className="px-2 py-1.5 text-center font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {sets.map((set, index) => (
              <tr key={index}>
                <td className="px-2 py-1.5 text-center font-mono text-gray-500">
                  {index + 1}
                </td>
                <td className="px-1 py-1">
                  <input
                    className={INPUT_CLS}
                    placeholder="53"
                    value={set.percentOneRm}
                    onChange={(e) =>
                      updateSet(index, { percentOneRm: e.target.value })
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={INPUT_CLS}
                    placeholder="3"
                    value={set.reps}
                    onChange={(e) => updateSet(index, { reps: e.target.value })}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={INPUT_CLS}
                    placeholder="5"
                    value={set.repScheme}
                    onChange={(e) =>
                      updateSet(index, { repScheme: e.target.value })
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={INPUT_CLS}
                    placeholder="8"
                    value={set.targetRpe}
                    onChange={(e) =>
                      updateSet(index, { targetRpe: e.target.value })
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={INPUT_CLS}
                    placeholder="152.5"
                    value={set.absoluteWeightKg}
                    onChange={(e) =>
                      updateSet(index, { absoluteWeightKg: e.target.value })
                    }
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeSet(index)}
                    disabled={sets.length <= 1}
                    className={cn(
                      "rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20",
                      sets.length <= 1 && "cursor-not-allowed opacity-30",
                    )}
                    title="Remove set"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">
        Har set ke liye RPE, reps, ya load alag ho sakta hai — ek hi exercise
        row mein ramp sets define karo.
      </p>
    </div>
  );
}
