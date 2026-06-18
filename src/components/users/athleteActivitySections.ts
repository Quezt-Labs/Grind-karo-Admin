import type { Purchase } from "@/types/user";
import {
  BarChart3,
  ClipboardList,
  HeartPulse,
  Sheet,
  StickyNote,
  Video,
  type LucideIcon,
} from "lucide-react";

export type AthleteActivitySection =
  | "videos"
  | "sheet"
  | "notes"
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

export function hasSheetCoachingContext(
  purchases: Purchase[],
  spreadsheetId?: string | null,
): boolean {
  const activeCoaching = purchases.some(
    (p) => p.kind === "coaching_subscription" && p.status === "ACTIVE",
  );
  return activeCoaching || Boolean(spreadsheetId?.trim());
}

export function buildAthleteActivityTabs(opts: {
  purchases: Purchase[];
  spreadsheetId?: string | null;
  pendingVideoCount?: number;
}): AthleteActivityTab[] {
  const { purchases, spreadsheetId, pendingVideoCount = 0 } = opts;
  const sheet = hasSheetCoachingContext(purchases, spreadsheetId);
  const program = hasPaidProgramPurchase(purchases);

  const tabs: AthleteActivityTab[] = [];

  if (sheet) {
    tabs.push({
      key: "videos",
      label: "Form-check review",
      description: "Pending videos, athlete notes, and coach comments",
      icon: Video,
      badge: pendingVideoCount > 0 ? pendingVideoCount : undefined,
    });
    tabs.push({
      key: "sheet",
      label: "Sheet program",
      description: "Full block/week/day view with logged load and RPE",
      icon: Sheet,
    });
    tabs.push({
      key: "notes",
      label: "Exercise notes",
      description: "All athlete notes by week and exercise",
      icon: StickyNote,
    });
  }

  if (program) {
    tabs.push({
      key: "logs",
      label: "Program workouts",
      description: "9to5-style in-app workout logs and set videos",
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
