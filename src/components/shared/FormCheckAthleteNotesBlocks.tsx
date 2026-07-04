interface FormCheckAthleteNotesBlocksProps {
  exerciseNotes?: string | null;
  setNotes?: string | null;
  setNumber?: number;
  /** @deprecated merged notes — shown only when split fields are absent */
  athleteNotes?: string | null;
}

export function FormCheckAthleteNotesBlocks({
  exerciseNotes,
  setNotes,
  setNumber,
  athleteNotes,
}: FormCheckAthleteNotesBlocksProps) {
  const exercise = exerciseNotes?.trim();
  const set = setNotes?.trim();
  const legacy = !exercise && !set ? athleteNotes?.trim() : null;

  if (!exercise && !set && !legacy) return null;

  return (
    <div className="mt-2 space-y-2">
      {exercise ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-2 dark:border-sky-800/60 dark:bg-sky-900/20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
            Exercise notes
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs text-sky-950 dark:text-sky-100">
            {exercise}
          </p>
        </div>
      ) : null}
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
