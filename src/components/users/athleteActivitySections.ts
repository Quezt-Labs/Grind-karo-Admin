import type { Purchase } from "@/types/user";
import {
  BarChart3,
  ClipboardList,
  HeartPulse,
  Video,
  type LucideIcon,
} from "lucide-react";

export type AthleteActivitySection =
  | "videos"
  | "logs"
  | "checkins"
  | "summaries";

export type AthleteActivityTab = {
  key: AthleteActivitySection;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: number;
};

export function hasPaidProgramPurchase(purchases: Purchase[]): boolean {
  return purchases.some(
    (p) => p.kind === "program_purchase" && p.status === "PAID",
  );
}

export function hasCoachingAthleteContext(purchases: Purchase[]): boolean {
  return purchases.some(
    (p) => p.kind === "coaching_subscription" && p.status === "ACTIVE",
  );
}

/** @deprecated Use hasCoachingAthleteContext */
export function hasSheetCoachingContext(
  purchases: Purchase[],
  _spreadsheetId?: string | null,
): boolean {
  return hasCoachingAthleteContext(purchases);
}

export function buildAthleteActivityTabs(opts: {
  purchases: Purchase[];
  pendingVideoCount?: number;
}): AthleteActivityTab[] {
  const { purchases, pendingVideoCount = 0 } = opts;
  const coaching = hasCoachingAthleteContext(purchases);
  const program = hasPaidProgramPurchase(purchases);

  const tabs: AthleteActivityTab[] = [];

  if (coaching) {
    tabs.push({
      key: "videos",
      label: "Form-check review",
      description: "Program workout videos, athlete notes, and coach comments",
      icon: Video,
      badge: pendingVideoCount > 0 ? pendingVideoCount : undefined,
    });
  }

  if (program || coaching) {
    tabs.push({
      key: "logs",
      label: "Program workouts",
      description: "In-app workout logs and set videos",
      icon: ClipboardList,
    });
  }

  tabs.push({
    key: "checkins",
    label: "Check-ins",
    description: "Progress photos and Big 3 PR history",
    icon: HeartPulse,
  });

  tabs.push({
    key: "summaries",
    label: "Weekly summaries",
    description: "Auto-generated week stats and form-check rollup",
    icon: BarChart3,
  });

  return tabs;
}

export function defaultAthleteActivitySection(
  tabs: AthleteActivityTab[],
): AthleteActivitySection {
  return tabs[0]?.key ?? "checkins";
}
