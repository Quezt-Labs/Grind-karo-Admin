import type { StatsData } from "@/types/dashboard";
import { programService } from "./programService";
import { enrollmentService } from "./enrollmentService";
import type { Program } from "@/types/program";

export const dashboardService = {
  async getStats(): Promise<StatsData[]> {
    const [programs, enrollments] = await Promise.all([
      programService.getAll(true).catch(() => [] as Program[]),
      enrollmentService.getMyEnrollments().catch(() => []),
    ]);

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
        title: "Total Enrollments",
        value: String(enrollments.length),
        change: 0,
        changeType: "increase",
        icon: "Award",
      },
      {
        id: "4",
        title: "Categories",
        value: String(new Set(programs.map((p) => p.category)).size),
        change: 0,
        changeType: "increase",
        icon: "LayoutDashboard",
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
