import type {
  Exercise,
  ExerciseCategory,
  ExercisesGrouped,
} from "@/types/programs";

export const EXERCISE_CATEGORY_ORDER: ExerciseCategory[] = [
  "SQUAT",
  "BENCH",
  "DEADLIFT",
  "ACCESSORY",
  "OTHER",
];

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  SQUAT: "Squat",
  BENCH: "Bench",
  DEADLIFT: "Deadlift",
  ACCESSORY: "Accessory",
  OTHER: "Other",
};

export function groupExercises(exercises: Exercise[]): ExercisesGrouped {
  const categories = {} as Record<ExerciseCategory, Exercise[]>;
  for (const cat of EXERCISE_CATEGORY_ORDER) {
    categories[cat] = [];
  }
  for (const row of exercises) {
    const key = EXERCISE_CATEGORY_ORDER.includes(row.category)
      ? row.category
      : "OTHER";
    categories[key].push(row);
  }
  return { categories };
}

/** Accepts flat array (admin API) or legacy grouped payload. */
export function normalizeExercisesGrouped(raw: unknown): ExercisesGrouped {
  if (Array.isArray(raw)) {
    return groupExercises(raw as Exercise[]);
  }
  if (raw && typeof raw === "object" && "categories" in raw) {
    return raw as ExercisesGrouped;
  }
  return groupExercises([]);
}

export function flattenExercises(grouped: ExercisesGrouped): Exercise[] {
  return EXERCISE_CATEGORY_ORDER.flatMap(
    (cat) => grouped.categories[cat] ?? [],
  );
}

export function filterGroupedExercises(
  grouped: ExercisesGrouped,
  predicate: (exercise: Exercise) => boolean,
): ExercisesGrouped {
  const categories = {} as Record<ExerciseCategory, Exercise[]>;
  for (const cat of EXERCISE_CATEGORY_ORDER) {
    categories[cat] = (grouped.categories[cat] ?? []).filter(predicate);
  }
  return { categories };
}

export function countExercises(grouped: ExercisesGrouped): number {
  return EXERCISE_CATEGORY_ORDER.reduce(
    (sum, cat) => sum + (grouped.categories[cat]?.length ?? 0),
    0,
  );
}

export function findExerciseById(
  grouped: ExercisesGrouped | undefined,
  id: string,
): Exercise | undefined {
  if (!grouped || !id) return undefined;
  for (const cat of EXERCISE_CATEGORY_ORDER) {
    const match = grouped.categories[cat]?.find((e) => e.id === id);
    if (match) return match;
  }
  return undefined;
}

export type ExerciseLibraryCategoryFilter = ExerciseCategory | "ALL";

/** Filter grouped library by search term and optional category tab. */
export function filterGroupedExercisesForPicker(
  grouped: ExercisesGrouped,
  opts: {
    search?: string;
    category?: ExerciseLibraryCategoryFilter;
    activeOnly?: boolean;
  },
): ExercisesGrouped {
  const term = opts.search?.trim().toLowerCase() ?? "";
  const activeOnly = opts.activeOnly ?? true;
  const categoryFilter = opts.category ?? "ALL";

  const matches = (exercise: Exercise) => {
    if (activeOnly && !exercise.isActive) return false;
    if (term) {
      const haystack = `${exercise.name} ${exercise.slug}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  };

  const categories = {} as Record<ExerciseCategory, Exercise[]>;
  for (const cat of EXERCISE_CATEGORY_ORDER) {
    if (categoryFilter !== "ALL" && categoryFilter !== cat) {
      categories[cat] = [];
      continue;
    }
    categories[cat] = (grouped.categories[cat] ?? []).filter(matches);
  }
  return { categories };
}

export function countFilteredExercises(grouped: ExercisesGrouped): number {
  return countExercises(grouped);
}
