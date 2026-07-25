import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Timer } from "lucide-react";
import { cn } from "@/utils/cn";
import api from "@/services/api";
import { UserProgressPanel } from "@/components/users/UserProgressPanel";
import { UserBigLiftPrPanel } from "@/components/users/UserBigLiftPrPanel";
import { UserTrackersPanel } from "@/components/users/UserTrackersPanel";
import type { UserActivityScope } from "@/utils/userActivityScope";

type CheckInSection =
  | "progress"
  | "bigLiftPr"
  | "weight"
  | "nutrition"
  | "competition";

interface CompetitionSummary {
  id: string;
  name: string;
  meetDate: string;
  daysLeft: number;
  federation: string | null;
  weightClass: string | null;
}

interface UserCheckInsPanelProps {
  userId: string;
  activityScope?: UserActivityScope;
}

function daysLeftLabel(daysLeft: number): string {
  if (daysLeft > 1) return `${daysLeft} days left`;
  if (daysLeft === 1) return "1 day left";
  if (daysLeft === 0) return "Meet day";
  if (daysLeft === -1) return "1 day ago";
  return `${Math.abs(daysLeft)} days ago`;
}

function formatMeetDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UserCheckInsPanel({
  userId,
  activityScope = { mode: "all" },
}: UserCheckInsPanelProps) {
  const [section, setSection] = useState<CheckInSection>("progress");

  const { data: competition, isError: competitionError } = useQuery({
    queryKey: ["admin-trackers", "competition", userId],
    queryFn: async () => {
      const { data: raw } = await api.get(
        `/admin/trackers/${userId}/competition`,
      );
      if (raw == null) return null;
      const unwrapped =
        typeof raw === "object" &&
        raw !== null &&
        "data" in raw &&
        (raw as { data: unknown }).data !== undefined
          ? (raw as { data: unknown }).data
          : raw;
      return unwrapped as CompetitionSummary | null;
    },
  });

  return (
    <div className="space-y-4">
      {competition && competition.name && competition.meetDate && (
        <button
          type="button"
          onClick={() => setSection("competition")}
          className="flex w-full items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left transition-colors hover:bg-amber-100/80 dark:border-amber-900/50 dark:bg-amber-950/40 dark:hover:bg-amber-950/60"
        >
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
            <Timer className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80">
              Comp countdown
            </p>
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {competition.name}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              {formatMeetDate(competition.meetDate)} ·{" "}
              <span className="font-medium">
                {daysLeftLabel(competition.daysLeft ?? 0)}
              </span>
              {(competition.federation || competition.weightClass) && (
                <>
                  {" "}
                  ·{" "}
                  {[competition.federation, competition.weightClass]
                    .filter(Boolean)
                    .join(" · ")}
                </>
              )}
            </p>
          </div>
          <span className="shrink-0 self-center text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Details →
          </span>
        </button>
      )}

      {competitionError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          Could not load competition countdown. Check API deploy / migration.
        </p>
      )}

      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/40">
        {(
          [
            { key: "progress" as const, label: "Progress photos" },
            { key: "weight" as const, label: "Bodyweight" },
            { key: "nutrition" as const, label: "Nutrition" },
            { key: "competition" as const, label: "Comp countdown" },
            { key: "bigLiftPr" as const, label: "Big 3 PRs" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSection(tab.key)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors min-w-[5.5rem]",
              section === tab.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === "progress" && (
        <UserProgressPanel
          userId={userId}
          compactHeader
          activityScope={activityScope}
        />
      )}
      {section === "weight" && (
        <UserTrackersPanel userId={userId} kind="weight" />
      )}
      {section === "nutrition" && (
        <UserTrackersPanel userId={userId} kind="nutrition" />
      )}
      {section === "competition" && (
        <UserTrackersPanel userId={userId} kind="competition" />
      )}
      {section === "bigLiftPr" && (
        <UserBigLiftPrPanel
          userId={userId}
          compactHeader
          activityScope={activityScope}
        />
      )}
    </div>
  );
}
