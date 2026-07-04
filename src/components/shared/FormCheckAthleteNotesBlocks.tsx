interface FormCheckAthleteNotesBlocksProps {
  setNotes?: string | null;
  setNumber?: number;
  /** @deprecated use setNotes — legacy merged notes from old exercise-level field */
  athleteNotes?: string | null;
  /** @deprecated ignored — exercise-level notes removed */
  exerciseNotes?: string | null;
}

export function FormCheckAthleteNotesBlocks({
  setNotes,
  setNumber,
  athleteNotes,
}: FormCheckAthleteNotesBlocksProps) {
  const set = setNotes?.trim();
  const legacy = !set && athleteNotes?.trim() ? athleteNotes.trim() : null;

  if (!set && !legacy) return null;

  return (
    <div className="mt-2 space-y-2">
      {set ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-800/60 dark:bg-amber-900/20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Set {setNumber ?? "?"} notes
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs text-amber-950 dark:text-amber-100">
            {set}
          </p>
        </div>
      ) : null}
      {legacy ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-800/60 dark:bg-amber-900/20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Athlete notes
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs text-amber-950 dark:text-amber-100">
            {legacy}
          </p>
        </div>
      ) : null}
    </div>
  );
}
