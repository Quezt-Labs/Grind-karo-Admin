import type { StatsData } from "@/types/dashboard";
import { programService } from "./programService";
import { enrollmentService } from "./enrollmentService";
import { planService } from "./planService";
import type { Program, Plan } from "@/types/program";

export const dashboardService = {
  async getStats(): Promise<StatsData[]> {
    const [programs, subscriptions] = await Promise.all([
      programService.getAll(true).catch(() => [] as Program[]),
      enrollmentService.getAllSubscriptions().catch(() => []),
    ]);

    // Fetch plans for all programs
    let allPlans: Plan[] = [];
    if (programs.length > 0) {
      const planArrays = await Promise.all(
        programs.map((p) => planService.getForProgram(p.id).catch(() => [])),
      );
      allPlans = planArrays.flat();
    }

    const activePrograms = programs.filter((p) => p.isActive);

    return [
      {
        id: "1",
        title: "Total Programs",
        value: String(programs.length),
        change: 0,
        changeType: "increase",
        icon: "Dumbbell",
      },
      {
        id: "2",
        title: "Active Programs",
        value: String(activePrograms.length),
        change: 0,
        changeType: "increase",
        icon: "Activity",
      },
      {
        id: "3",
        title: "Total Plans",
        value: String(allPlans.length),
        change: 0,
        changeType: "increase",
        icon: "CreditCard",
      },
      {
        id: "4",
        title: "Subscriptions",
        value: String(subscriptions.length),
        change: 0,
        changeType: "increase",
        icon: "Award",
      },
    ];
  },

  async getRecentPrograms(): Promise<Program[]> {
    const programs = await programService.getAll(true);
    return programs
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, 5);
  },
};
