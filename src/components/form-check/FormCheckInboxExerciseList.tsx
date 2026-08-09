import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BulkFormCheckCommentBar } from "@/components/shared/BulkFormCheckCommentBar";
import { FormCheckInboxExerciseCard } from "@/components/form-check/FormCheckInboxExerciseCard";
import type { ThreadFocusType } from "@/hooks/useFormCheckInboxRoute";
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
  onLoadMore,
  isLoadingMore = false,
  onAllPendingReviewed,
  showBulkBar = true,
  bulkBarSticky = true,
  bulkBarStickyTopClassName = "top-0",
  focusVideoId = null,
  focusCommentId = null,
  focusMessageId = null,
  focusThreadType = null,
  focusAction = null,
}: {
  exerciseGroups: FormCheckInboxGroup[];
  pendingCount: number;
  onBulkApply: (comment: string) => Promise<BulkCommentResult>;
  listKey?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onAllPendingReviewed?: () => void;
  showBulkBar?: boolean;
  bulkBarSticky?: boolean;
  bulkBarStickyTopClassName?: string;
  focusVideoId?: string | null;
  focusCommentId?: string | null;
  focusMessageId?: string | null;
  focusThreadType?: ThreadFocusType | null;
  focusAction?: string | null;
}) {
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const prevPendingRef = useRef(pendingCount);

  const focusGroupKey = useMemo(() => {
    if (!focusVideoId) return null;
    return (
      exerciseGroups.find((g) => g.videos.some((v) => v.id === focusVideoId))
        ?.key ?? null
    );
  }, [exerciseGroups, focusVideoId]);

  const defaultActiveKey =
    focusGroupKey ??
    exerciseGroups.find((g) => g.pendingCount > 0)?.key ??
    exerciseGroups[0]?.key ??
    null;

  const [activeKey, setActiveKey] = useState<string | null>(defaultActiveKey);
  const [prevListKey, setPrevListKey] = useState(listKey);
  const [prevFocusVideoId, setPrevFocusVideoId] = useState(focusVideoId);

  if (listKey !== prevListKey) {
    setPrevListKey(listKey);
    setActiveKey(defaultActiveKey);
  }

  // Deep-link: adopt focused exercise during render (not in an effect).
  if (focusVideoId !== prevFocusVideoId) {
    setPrevFocusVideoId(focusVideoId);
    if (focusGroupKey) setActiveKey(focusGroupKey);
  }

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

  // DOM scroll only — activeKey already set during render for deep links.
  useEffect(() => {
    if (!focusVideoId || !focusGroupKey) return;
    scrollToCard(focusGroupKey);
  }, [focusVideoId, focusGroupKey, scrollToCard]);

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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              More videos available. Use &ldquo;Needs review&rdquo; to narrow
              the list, or load more below.
            </p>
          </div>
          {onLoadMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          ) : null}
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
            focusVideoId={
              focusVideoId && group.videos.some((v) => v.id === focusVideoId)
                ? focusVideoId
                : null
            }
            focusCommentId={focusCommentId}
            focusMessageId={focusMessageId}
            focusThreadType={focusThreadType}
            focusAction={focusAction}
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
