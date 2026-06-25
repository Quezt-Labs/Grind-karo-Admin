import { cn } from "@/utils/cn";

export type ProgramEditorTab = "structure" | "movement-selection" | "preview";

const TABS: { id: ProgramEditorTab; label: string }[] = [
  { id: "structure", label: "Structure" },
  { id: "movement-selection", label: "Movement Selection" },
  { id: "preview", label: "Preview" },
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
    <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
