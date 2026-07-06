import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BulkFormCheckCommentBar } from "@/components/shared/BulkFormCheckCommentBar";
import { FormCheckInboxExerciseCard } from "@/components/form-check/FormCheckInboxExerciseCard";
import type { BulkCommentResult } from "@/utils/bulkFormCheckComments";
import type { FormCheckInboxGroup } from "@/utils/groupFormCheckInboxItems";
import { formCheckExerciseDomId } from "@/utils/groupFormCheckInboxItems";
import { scrollToPageElement } from "@/utils/scrollToPageElement";
import { cn } from "@/utils/cn";

export function FormCheckInboxExerciseList({
  exerciseGroups,
  pendingCount,
  onBulkApply,
  listKey,
  hasMore,
  onAllPendingReviewed,
  showBulkBar = true,
  bulkBarSticky = true,
  bulkBarStickyTopClassName = "top-0",
}: {
  exerciseGroups: FormCheckInboxGroup[];
  pendingCount: number;
  onBulkApply: (comment: string) => Promise<BulkCommentResult>;
  listKey?: string;
  hasMore?: boolean;
  onAllPendingReviewed?: () => void;
  showBulkBar?: boolean;
  bulkBarSticky?: boolean;
  bulkBarStickyTopClassName?: string;
}) {
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const prevPendingRef = useRef(pendingCount);

  const [activeKey, setActiveKey] = useState<string | null>(
    () =>
      exerciseGroups.find((g) => g.pendingCount > 0)?.key ??
      exerciseGroups[0]?.key ??
      null,
  );

  const scrollToCard = useCallback((key: string) => {
    const el =
      cardRefs.current.get(key) ??
      document.getElementById(formCheckExerciseDomId(key));
    if (el) scrollToPageElement(el, { behavior: "auto" });
  }, []);

  const goToExercise = useCallback(
    (key: string) => {
      scrollToCard(key);
      setActiveKey(key);
    },
    [scrollToCard],
  );

  useEffect(() => {
    setActiveKey(
      exerciseGroups.find((g) => g.pendingCount > 0)?.key ??
        exerciseGroups[0]?.key ??
        null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when athlete/filter changes
  }, [listKey]);

  useEffect(() => {
    if (
      prevPendingRef.current > 0 &&
      pendingCount === 0 &&
      onAllPendingReviewed
    ) {
      onAllPendingReviewed();
    }
    prevPendingRef.current = pendingCount;
  }, [pendingCount, onAllPendingReviewed]);

  const activeIndex = exerciseGroups.findIndex((g) => g.key === activeKey);
  const nextPendingGroup = exerciseGroups
    .slice(activeIndex + 1)
    .find((g) => g.pendingCount > 0);

  return (
    <div key={listKey} className="space-y-3">
      {hasMore ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Showing first 100 videos. Use &ldquo;Needs review&rdquo; to narrow
            the list, or contact engineering if more pagination is needed.
          </p>
        </div>
      ) : null}

      {showBulkBar ? (
        <div className={cn(bulkBarSticky && "-mx-1 px-1 pb-2 pt-1")}>
          <BulkFormCheckCommentBar
            pendingCount={pendingCount}
            onApply={onBulkApply}
            sticky={bulkBarSticky}
            stickyTopClassName={bulkBarStickyTopClassName}
          />
        </div>
      ) : null}

      <div className="min-w-0 space-y-3">
        {exerciseGroups.map((group) => (
          <FormCheckInboxExerciseCard
            key={group.key}
            id={formCheckExerciseDomId(group.key)}
            ref={(el) => {
              if (el) cardRefs.current.set(group.key, el);
              else cardRefs.current.delete(group.key);
            }}
            videos={group.videos}
            showAthleteLink={false}
            isNavActive={group.key === activeKey}
            onGoToNextExercise={
              nextPendingGroup && group.key === activeKey
                ? () => goToExercise(nextPendingGroup.key)
                : undefined
            }
            hasNextPendingExercise={
              !!nextPendingGroup && group.key === activeKey
            }
          />
        ))}
      </div>
    </div>
  );
}
