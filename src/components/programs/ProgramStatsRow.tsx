import { Clock, Dumbbell, CalendarDays, BarChart3 } from "lucide-react";
import { LevelBadge } from "@/components/ui/LevelBadge";
import type { Program } from "@/types/program";

interface ProgramStatsRowProps {
  program: Program;
}

function StatCard({
  icon,
  iconBg,
  children,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${iconBg}`}>{icon}</div>
      {children}
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export function ProgramStatsRow({ program }: ProgramStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        iconBg="bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
        label="Weeks Duration"
      >
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {program.duration}
        </p>
      </StatCard>

      <StatCard
        icon={<Dumbbell className="h-5 w-5" />}
        iconBg="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        label="Frequency"
      >
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {program.frequency}
        </p>
      </StatCard>

      <StatCard
        icon={<BarChart3 className="h-5 w-5" />}
        iconBg="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
        label="Difficulty"
      >
        <div className="mt-1">
          <LevelBadge level={program.level} className="text-sm" />
        </div>
        {/* extra mt to align with other stat cards */}
        <p className="mt-1" />
      </StatCard>

      <StatCard
        icon={<CalendarDays className="h-5 w-5" />}
        iconBg="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
        label="Sort Order"
      >
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {program.sortOrder}
        </p>
      </StatCard>
    </div>
  );
}
