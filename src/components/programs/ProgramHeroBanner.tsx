import { Star } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Program } from "@/types/program";

interface ProgramHeroBannerProps {
  program: Program;
}

export function ProgramHeroBanner({ program }: ProgramHeroBannerProps) {
  const badgeLabel = program.badge
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary-600 via-primary-700 to-primary-900 text-white shadow-lg">
      {program.image && (
        <img
          src={program.image}
          alt={program.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {program.image && <div className="absolute inset-0 bg-black/50" />}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

      <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wider">
              {program.category}
            </span>
            {badgeLabel && (
              <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400/90 px-2 py-0.5 text-xs font-bold text-yellow-900">
                <Star className="h-3 w-3" />
                {badgeLabel}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{program.name}</h1>
          {program.tagline && (
            <p className="max-w-lg text-sm text-white/80">{program.tagline}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge
            status={program.isActive ? "Active" : "Inactive"}
            className={
              program.isActive
                ? "bg-green-400/20! text-green-100!"
                : "bg-red-400/20! text-red-200!"
            }
          />
        </div>
      </div>
    </div>
  );
}
