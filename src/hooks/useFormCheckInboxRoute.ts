import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsAssistantCoach } from "@/hooks/useRole";

export type PlanTier = "mega" | "ultra";
export type ReviewFilter = "pending" | "reviewed" | "all";
export type HandlerFilter = "all" | "assistant_coach" | "admin";

const TIER_VALUES: PlanTier[] = ["mega", "ultra"];
const REVIEW_VALUES: ReviewFilter[] = ["pending", "reviewed", "all"];
const HANDLER_VALUES: HandlerFilter[] = ["all", "assistant_coach", "admin"];

function parseTier(value: string | null): PlanTier {
  return TIER_VALUES.includes(value as PlanTier) ? (value as PlanTier) : "mega";
}

function parseReview(value: string | null): ReviewFilter {
  return REVIEW_VALUES.includes(value as ReviewFilter)
    ? (value as ReviewFilter)
    : "pending";
}

function parseHandler(value: string | null): HandlerFilter | null {
  if (!value) return null;
  return HANDLER_VALUES.includes(value as HandlerFilter)
    ? (value as HandlerFilter)
    : null;
}

function parseWeek(value: string | null): number | null {
  if (!value || value === "all") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDay(value: string | null): number | null {
  if (!value || value === "all") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function useFormCheckInboxRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isAssistantCoach = useIsAssistantCoach();

  const tier = parseTier(searchParams.get("tier"));
  const selectedUserId = searchParams.get("userId");
  const reviewFilter = parseReview(searchParams.get("review"));
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

  const setPlanTier = useCallback(
    (next: PlanTier) => {
      patchParams({ tier: next, userId: null });
    },
    [patchParams],
  );

  const setSelectedUserId = useCallback(
    (userId: string | null) => {
      patchParams({ userId, week: null, day: null });
    },
    [patchParams],
  );

  const setReviewFilter = useCallback(
    (next: ReviewFilter) => {
      patchParams({ review: next });
    },
    [patchParams],
  );

  const setWeekNumber = useCallback(
    (week: number | null) => {
      patchParams({ week: week == null ? null : String(week) });
    },
    [patchParams],
  );

  const setDayNumber = useCallback(
    (day: number | null) => {
      patchParams({ day: day == null ? null : String(day) });
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
    patchParams({ userId: null, week: null, day: null });
  }, [patchParams]);

  return useMemo(
    () => ({
      tier,
      selectedUserId,
      reviewFilter,
      handlerFilter,
      weekNumber,
      dayNumber,
      setPlanTier,
      setSelectedUserId,
      setReviewFilter,
      setHandlerFilter,
      setWeekNumber,
      setDayNumber,
      clearAthleteSelection,
    }),
    [
      tier,
      selectedUserId,
      reviewFilter,
      handlerFilter,
      weekNumber,
      dayNumber,
      setPlanTier,
      setSelectedUserId,
      setReviewFilter,
      setHandlerFilter,
      setWeekNumber,
      setDayNumber,
      clearAthleteSelection,
    ],
  );
}
