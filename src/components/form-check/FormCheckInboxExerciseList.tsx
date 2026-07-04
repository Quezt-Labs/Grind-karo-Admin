import { useMemo, useState } from "react";
import { BulkFormCheckCommentBar } from "@/components/shared/BulkFormCheckCommentBar";
import { FormCheckInboxExerciseCard } from "@/components/form-check/FormCheckInboxExerciseCard";
import type { BulkCommentResult } from "@/utils/bulkFormCheckComments";
import type { FormCheckInboxGroup } from "@/utils/groupFormCheckInboxItems";

type ExpansionChoice = string | null | undefined;

export function FormCheckInboxExerciseList({
  exerciseGroups,
  pendingCount,
  onBulkApply,
  listKey,
}: {
  exerciseGroups: FormCheckInboxGroup[];
  pendingCount: number;
  onBulkApply: (comment: string) => Promise<BulkCommentResult>;
  /** Remount expansion state when athlete or filter changes */
  listKey?: string;
}) {
  const autoExpandedKey = useMemo(() => {
    if (exerciseGroups.length === 0) return null;
    const firstPending = exerciseGroups.find((g) => g.pendingCount > 0);
    return firstPending?.key ?? exerciseGroups[0]?.key ?? null;
  }, [exerciseGroups]);

  const [expansionChoice, setExpansionChoice] =
    useState<ExpansionChoice>(undefined);

  const expandedGroupKey = useMemo(() => {
    if (expansionChoice === null) return null;
    if (
      typeof expansionChoice === "string" &&
      exerciseGroups.some((g) => g.key === expansionChoice)
    ) {
      return expansionChoice;
    }
    return autoExpandedKey;
  }, [expansionChoice, exerciseGroups, autoExpandedKey]);

  return (
    <div key={listKey} className="space-y-3">
      <BulkFormCheckCommentBar
        pendingCount={pendingCount}
        onApply={onBulkApply}
      />
      {exerciseGroups.map((group) => (
        <FormCheckInboxExerciseCard
          key={group.key}
          videos={group.videos}
          showAthleteLink={false}
          expanded={expandedGroupKey === group.key}
          onToggle={() =>
            setExpansionChoice((current) => {
              const effective =
                current === null
                  ? null
                  : typeof current === "string" &&
                      exerciseGroups.some((g) => g.key === current)
                    ? current
                    : autoExpandedKey;
              return effective === group.key ? null : group.key;
            })
          }
        />
      ))}
    </div>
  );
}
