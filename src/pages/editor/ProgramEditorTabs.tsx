import { cn } from "@/utils/cn";

export type ProgramEditorTab =
  | "structure"
  | "compare"
  | "movement-selection"
  | "loads"
  | "preview"
  | "warmup";

const TABS: { id: ProgramEditorTab; label: string; shortLabel: string }[] = [
  { id: "structure", label: "Structure", shortLabel: "Structure" },
  { id: "compare", label: "Compare", shortLabel: "Compare" },
  {
    id: "movement-selection",
    label: "Movement Selection",
    shortLabel: "Movement",
  },
  { id: "loads", label: "Load settings", shortLabel: "Loads" },
  { id: "preview", label: "Preview", shortLabel: "Preview" },
  { id: "warmup", label: "Warmup", shortLabel: "Warmup" },
];

interface ProgramEditorTabsProps {
  active: ProgramEditorTab;
  onChange: (tab: ProgramEditorTab) => void;
}

export function ProgramEditorTabs({
  active,
  onChange,
}: ProgramEditorTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 scrollbar-thin">
      <div className="flex w-max min-w-full gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50 sm:w-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              active === tab.id
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
            )}
          >
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
