import { memo } from "react";
import { Clock, Dumbbell, Target, Star, Zap } from "lucide-react";
import { LevelBadge } from "@/components/ui/LevelBadge";
import type { PricingTier } from "@/types/program";

interface ProgramPreviewProps {
  name: string;
  tagline?: string;
  description: string;
  level: string;
  duration: number;
  frequency: string;
  highlights: string[];
  goals: string[];
  badge?: string;
  category: string;
  pricingTiers: Partial<PricingTier>[];
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function ProgramPreviewInner({
  name,
  tagline,
  description,
  level,
  duration,
  frequency,
  highlights,
  goals,
  badge,
  category,
  pricingTiers,
}: ProgramPreviewProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Live Preview
      </p>

      {/* Program Card */}
      <div className="rounded-2xl border bg-white shadow-sm dark:bg-gray-800">
        {/* Header */}
        <div className="relative rounded-t-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white">
          {badge && (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-bold text-yellow-900">
              <Star className="h-3 w-3" />
              {badge.replace(/_/g, " ")}
            </span>
          )}
          <span className="text-xs font-medium uppercase tracking-wider opacity-80">
            {category || "Category"}
          </span>
          <h3 className="mt-1 text-xl font-bold">{name || "Program Name"}</h3>
          {tagline && <p className="mt-1 text-sm opacity-90">{tagline}</p>}
        </div>

        {/* Meta */}
        <div className="flex gap-4 border-b px-6 py-3 text-sm text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {duration || 0} weeks
          </span>
          <span className="flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4" />
            {frequency || "—"}
          </span>
          {level && <LevelBadge level={level} />}
        </div>

        {/* Description */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {description || "Program description will appear here..."}
          </p>
        </div>

        {/* Highlights */}
        {highlights.filter(Boolean).length > 0 && (
          <div className="border-t px-6 py-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Highlights
            </h4>
            <ul className="space-y-1.5">
              {highlights.filter(Boolean).map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Goals */}
        {goals.filter(Boolean).length > 0 && (
          <div className="border-t px-6 py-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Goals
            </h4>
            <ul className="space-y-1.5">
              {goals.filter(Boolean).map((g, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pricing Tiers */}
        {pricingTiers.length > 0 && (
          <div className="border-t px-6 py-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pricing
            </h4>
            <div className="grid gap-3">
              {pricingTiers.map((tier, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border bg-gray-50 p-3 dark:bg-gray-700/50"
                >
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tier.tier || "TIER"}
                    </span>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {tier.validityDays || 0} days
                    </span>
                  </div>
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                    {formatPrice(tier.price || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const ProgramPreview = memo(ProgramPreviewInner);
