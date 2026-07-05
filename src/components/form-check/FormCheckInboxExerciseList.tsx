import { BulkFormCheckCommentBar } from "@/components/shared/BulkFormCheckCommentBar";
import { FormCheckInboxExerciseCard } from "@/components/form-check/FormCheckInboxExerciseCard";
import type { BulkCommentResult } from "@/utils/bulkFormCheckComments";
import type { FormCheckInboxGroup } from "@/utils/groupFormCheckInboxItems";

export function FormCheckInboxExerciseList({
  exerciseGroups,
  pendingCount,
  onBulkApply,
  listKey,
}: {
  exerciseGroups: FormCheckInboxGroup[];
  pendingCount: number;
  onBulkApply: (comment: string) => Promise<BulkCommentResult>;
  /** Remount list when athlete or filter changes */
  listKey?: string;
}) {
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
        />
      ))}
    </div>
  );
}
