import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsAssistantCoach } from "@/hooks/useRole";

export type PlanTier = "mega" | "ultra";
export type ReviewFilter = "pending" | "reviewed" | "all";
export type InboxLayout = "videos" | "feedback";
export type HandlerFilter = "all" | "assistant_coach" | "admin";
export type InboxView = "inbox" | "missing";
export type ThreadFocusType = "workout" | "sheets";

const TIER_VALUES: PlanTier[] = ["mega", "ultra"];
const REVIEW_VALUES: ReviewFilter[] = ["pending", "reviewed", "all"];
const LAYOUT_VALUES: InboxLayout[] = ["videos", "feedback"];
const HANDLER_VALUES: HandlerFilter[] = ["all", "assistant_coach", "admin"];
const VIEW_VALUES: InboxView[] = ["inbox", "missing"];

function parseTier(value: string | null): PlanTier {
  return TIER_VALUES.includes(value as PlanTier) ? (value as PlanTier) : "mega";
}

function parseReview(value: string | null): ReviewFilter {
  return REVIEW_VALUES.includes(value as ReviewFilter)
    ? (value as ReviewFilter)
    : "pending";
}

function parseView(value: string | null): InboxView {
  return VIEW_VALUES.includes(value as InboxView)
    ? (value as InboxView)
    : "inbox";
}

function parseLayout(
  value: string | null,
  reviewFilter: ReviewFilter,
): InboxLayout {
  if (LAYOUT_VALUES.includes(value as InboxLayout)) {
    return value as InboxLayout;
  }
  return reviewFilter === "reviewed" ? "feedback" : "videos";
}

function parseHandler(value: string | null): HandlerFilter | null {
  if (!value) return null;
  return HANDLER_VALUES.includes(value as HandlerFilter)
    ? (value as HandlerFilter)
    : null;
}

function parseWeek(value: string | null): number | null {
  if (!value || value === "all") return null;
  if (value === "none" || value === "-1") return -1;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDay(value: string | null): number | null {
  if (!value || value === "all") return null;
  if (value === "none" || value === "-1") return -1;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseThreadType(value: string | null): ThreadFocusType | null {
  if (!value) return null;
  return value === "sheets" ? "sheets" : value === "workout" ? "workout" : null;
}

export function useFormCheckInboxRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAssistantCoach = useIsAssistantCoach();

  const view = parseView(searchParams.get("view"));
  const tier = parseTier(searchParams.get("tier"));
  const selectedUserId = searchParams.get("userId");
  const focusVideoId = searchParams.get("videoId");
  const focusCommentId = searchParams.get("commentId");
  const focusMessageId = searchParams.get("messageId");
  const focusThreadType = parseThreadType(searchParams.get("threadType"));
  const focusAction = searchParams.get("action");
  const reviewFilter = parseReview(searchParams.get("review"));
  const layout = parseLayout(searchParams.get("layout"), reviewFilter);
  const weekNumber = parseWeek(searchParams.get("week"));
  const dayNumber = parseDay(searchParams.get("day"));

  const handlerFromUrl = parseHandler(searchParams.get("handler"));
  const handlerFilter: HandlerFilter =
    handlerFromUrl ?? (isAssistantCoach ? "assistant_coach" : "all");

  useEffect(() => {
    if (isAssistantCoach && !searchParams.has("handler")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("handler", "assistant_coach");
          return next;
        },
        { replace: true },
      );
    }
  }, [isAssistantCoach, searchParams, setSearchParams]);

  const patchParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value == null || value === "") next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!focusThreadType) return;
    if (focusCommentId || focusVideoId) return;
    patchParams({
      threadType: null,
      action: null,
      messageId: null,
    });
  }, [focusThreadType, focusCommentId, focusVideoId, patchParams]);

  const setView = useCallback(
    (next: InboxView) => {
      patchParams({
        view: next === "inbox" ? null : next,
        userId: null,
        videoId: null,
        commentId: null,
        messageId: null,
        threadType: null,
        action: null,
        week: null,
        day: null,
      });
    },
    [patchParams],
  );

  const setPlanTier = useCallback(
    (next: PlanTier) => {
      patchParams({
        tier: next,
        userId: null,
        videoId: null,
        commentId: null,
        messageId: null,
        threadType: null,
        action: null,
      });
    },
    [patchParams],
  );

  const setSelectedUserId = useCallback(
    (userId: string | null) => {
      patchParams({
        userId,
        videoId: null,
        commentId: null,
        messageId: null,
        threadType: null,
        action: null,
        week: null,
        day: null,
      });
    },
    [patchParams],
  );

  const repairThreadContext = useCallback(
    (patch: {
      userId?: string | null;
      videoId?: string | null;
      threadType?: ThreadFocusType | null;
    }) => {
      patchParams({
        userId: patch.userId,
        videoId: patch.videoId,
        threadType: patch.threadType,
      });
    },
    [patchParams],
  );

  const setFocusVideoId = useCallback(
    (videoId: string | null) => {
      patchParams({ videoId, commentId: null, messageId: null, action: null });
    },
    [patchParams],
  );

  const clearThreadFocus = useCallback(() => {
    patchParams({
      commentId: null,
      messageId: null,
      threadType: null,
      action: null,
    });
  }, [patchParams]);

  const setReviewFilter = useCallback(
    (next: ReviewFilter) => {
      patchParams({
        review: next,
        layout:
          next === "pending"
            ? "videos"
            : next === "reviewed"
              ? "feedback"
              : undefined,
      });
    },
    [patchParams],
  );

  const setLayout = useCallback(
    (next: InboxLayout) => {
      patchParams({ layout: next });
    },
    [patchParams],
  );

  const setWeekNumber = useCallback(
    (week: number | null) => {
      const weekParam =
        week == null ? null : week === -1 ? "none" : String(week);
      patchParams({ week: weekParam, day: null });
    },
    [patchParams],
  );

  const setDayNumber = useCallback(
    (day: number | null) => {
      const dayParam = day == null ? null : day === -1 ? "none" : String(day);
      patchParams({ day: dayParam });
    },
    [patchParams],
  );

  const setHandlerFilter = useCallback(
    (next: HandlerFilter) => {
      patchParams({ handler: next });
    },
    [patchParams],
  );

  const clearAthleteSelection = useCallback(() => {
    patchParams({
      userId: null,
      videoId: null,
      commentId: null,
      messageId: null,
      threadType: null,
      action: null,
      week: null,
      day: null,
    });
  }, [patchParams]);

  return useMemo(
    () => ({
      view,
      tier,
      selectedUserId,
      focusVideoId,
      focusCommentId,
      focusMessageId,
      focusThreadType,
      focusAction,
      reviewFilter,
      layout,
      handlerFilter,
      weekNumber,
      dayNumber,
      setView,
      setPlanTier,
      setSelectedUserId,
      repairThreadContext,
      setFocusVideoId,
      clearThreadFocus,
      setReviewFilter,
      setLayout,
      setHandlerFilter,
      setWeekNumber,
      setDayNumber,
      clearAthleteSelection,
    }),
    [
      view,
      tier,
      selectedUserId,
      focusVideoId,
      focusCommentId,
      focusMessageId,
      focusThreadType,
      focusAction,
      reviewFilter,
      layout,
      handlerFilter,
      weekNumber,
      dayNumber,
      setView,
      setPlanTier,
      setSelectedUserId,
      repairThreadContext,
      setFocusVideoId,
      clearThreadFocus,
      setReviewFilter,
      setLayout,
      setHandlerFilter,
      setWeekNumber,
      setDayNumber,
      clearAthleteSelection,
    ],
  );
}
