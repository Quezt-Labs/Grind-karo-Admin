import { useState } from "react";
import { cn } from "@/utils/cn";
import type { ProgramTree } from "@/types/programs";
import { ProgramWeekCompareView } from "./ProgramWeekCompareView";
import { ProgramBlockCompareView } from "./ProgramBlockCompareView";

type CompareMode = "week" | "block";

const MODES: { id: CompareMode; label: string }[] = [
  { id: "week", label: "Week comparison" },
  { id: "block", label: "Block comparison" },
];

interface ProgramComparePanelProps {
  tree: ProgramTree;
}

export function ProgramComparePanel({ tree }: ProgramComparePanelProps) {
  const [mode, setMode] = useState<CompareMode>("week");

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 bg-gray-50/80 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/60 sm:px-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Compare program structure
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Side-by-side view to spot differences between weeks or blocks.
        </p>
        <div className="mt-3 flex gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-600 dark:bg-gray-900/40">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none",
                mode === m.id
                  ? "bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-950/50 dark:text-primary-300"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {mode === "week" ? (
          <ProgramWeekCompareView tree={tree} />
        ) : (
          <ProgramBlockCompareView tree={tree} />
        )}
      </div>
    </div>
  );
}
