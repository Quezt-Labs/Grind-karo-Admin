import { useState } from "react";
import { cn } from "@/utils/cn";
import { UserProgressPanel } from "@/components/users/UserProgressPanel";
import { UserBigLiftPrPanel } from "@/components/users/UserBigLiftPrPanel";
import { UserTrackersPanel } from "@/components/users/UserTrackersPanel";
import type { UserActivityScope } from "@/utils/userActivityScope";

type CheckInSection = "progress" | "bigLiftPr" | "weight" | "nutrition";

interface UserCheckInsPanelProps {
  userId: string;
  activityScope?: UserActivityScope;
}

export function UserCheckInsPanel({
  userId,
  activityScope = { mode: "all" },
}: UserCheckInsPanelProps) {
  const [section, setSection] = useState<CheckInSection>("progress");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/40">
        {(
          [
            { key: "progress" as const, label: "Progress photos" },
            { key: "weight" as const, label: "Bodyweight" },
            { key: "nutrition" as const, label: "Nutrition" },
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
