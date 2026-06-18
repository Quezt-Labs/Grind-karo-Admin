export type SheetWorkoutContextChip = {
  label: string;
  tone?: "default" | "block" | "accent" | "muted";
};

export function buildSheetWorkoutContextChips(opts: {
  tabName?: string | null;
  weekNumber?: number | null;
  dayNumber?: number | null;
  setNumber?: number | null;
  category?: string | null;
  sortOrder?: number | null;
}): SheetWorkoutContextChip[] {
  const chips: SheetWorkoutContextChip[] = [];
  const tab = opts.tabName?.trim();
  if (tab) chips.push({ label: tab, tone: "block" });
  if (opts.weekNumber != null) {
    chips.push({ label: `W${opts.weekNumber}`, tone: "default" });
  }
  if (opts.dayNumber != null) {
    chips.push({ label: `Day ${opts.dayNumber}`, tone: "default" });
  }
  if (opts.setNumber != null) {
    chips.push({ label: `Set ${opts.setNumber}`, tone: "accent" });
  }
  const category = opts.category?.trim();
  if (category) chips.push({ label: category, tone: "muted" });
  if (opts.sortOrder != null && opts.sortOrder > 0) {
    chips.push({ label: `#${opts.sortOrder}`, tone: "muted" });
  }
  return chips;
}
