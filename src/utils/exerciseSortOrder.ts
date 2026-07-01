/** Stable sort for exercise rows on a program day. */
export function sortDayExercises<T extends { sortOrder: number; id: string }>(
  exercises: T[],
): T[] {
  return [...exercises].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
}

export function nextExerciseSortOrder(
  exercises: Array<{ sortOrder: number }>,
): number {
  if (!exercises.length) return 0;
  return Math.max(...exercises.map((row) => row.sortOrder)) + 1;
}
