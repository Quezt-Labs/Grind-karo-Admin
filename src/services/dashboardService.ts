import type { StatsData } from "@/types/dashboard";
import { planService } from "./planService";
import { addonService } from "./addonService";
import { enrollmentService } from "./enrollmentService";
import type { CoachingPlan } from "@/types/program";

export const dashboardService = {
  async getStats(): Promise<StatsData[]> {
    const [plans, addons, subscriptions] = await Promise.all([
      planService.getAll().catch(() => []),
      addonService.getAll().catch(() => []),
      enrollmentService.getAll().catch(() => []),
    ]);

    const activePlans = plans.filter((p) => p.isActive);
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "ACTIVE",
    );

    return [
      {
        id: "1",
        title: "Total Plans",
        value: String(plans.length),
        change: 0,
        changeType: "increase",
        icon: "CreditCard",
      },
      {
        id: "2",
        title: "Active Plans",
        value: String(activePlans.length),
        change: 0,
        changeType: "increase",
        icon: "Activity",
      },
      {
        id: "3",
        title: "Add-ons",
        value: String(addons.length),
        change: 0,
        changeType: "increase",
        icon: "Puzzle",
      },
      {
        id: "4",
        title: "Active Subscriptions",
        value: String(activeSubscriptions.length),
        change: 0,
        changeType: "increase",
        icon: "Award",
      },
    ];
  },

  async getRecentPlans(): Promise<CoachingPlan[]> {
    const plans = await planService.getAll();
    return plans
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);
  },
};
