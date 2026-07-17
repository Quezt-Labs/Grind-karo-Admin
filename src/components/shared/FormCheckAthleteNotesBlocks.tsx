import { LinkifiedText } from "@/components/shared/LinkifiedText";

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
          <LinkifiedText
            text={set}
            className="mt-0.5 text-xs text-amber-950 dark:text-amber-100"
            linkClassName="break-all font-medium text-amber-900 underline underline-offset-2 hover:opacity-90 dark:text-amber-200"
          />
        </div>
      ) : null}
      {legacy ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-800/60 dark:bg-amber-900/20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Athlete notes
          </p>
          <LinkifiedText
            text={legacy}
            className="mt-0.5 text-xs text-amber-950 dark:text-amber-100"
            linkClassName="break-all font-medium text-amber-900 underline underline-offset-2 hover:opacity-90 dark:text-amber-200"
          />
        </div>
      ) : null}
    </div>
  );
}
