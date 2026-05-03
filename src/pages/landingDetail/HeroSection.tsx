import { memo } from "react";
import { ExternalLink } from "lucide-react";
import type { LandingPageConfig } from "@/types/landingPage";

export function InfoCell({
  label,
  value,
  isUrl,
}: {
  label: string;
  value?: string | null;
  isUrl?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      {value ? (
        isUrl ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 truncate text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            {new URL(value).pathname.slice(0, 40)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="mt-0.5 truncate text-sm text-gray-700 dark:text-gray-300">
            {value}
          </p>
        )
      ) : (
        <p className="mt-0.5 text-sm text-gray-400">—</p>
      )}
    </div>
  );
}

interface HeroSectionProps {
  config: LandingPageConfig;
}

export const HeroSection = memo(function HeroSection({
  config,
}: HeroSectionProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
        Hero Section
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Banner (Web)
          </p>
          {config.heroBannerWebUrl ? (
            <img
              src={config.heroBannerWebUrl}
              alt={config.heroBannerAlt ?? "Hero banner"}
              className="h-40 w-full rounded-lg border object-cover dark:border-gray-600"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-600">
              No web banner
            </div>
          )}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Banner (Mobile)
          </p>
          {config.heroBannerMobileUrl ? (
            <img
              src={config.heroBannerMobileUrl}
              alt={config.heroBannerAlt ?? "Hero banner"}
              className="h-40 w-auto mx-auto rounded-lg border object-cover dark:border-gray-600"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-600">
              No mobile banner
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCell label="Banner Link" value={config.heroBannerLinkUrl} isUrl />
        <InfoCell label="Video URL" value={config.heroVideoUrl} isUrl />
        <InfoCell
          label="Video Poster"
          value={config.heroVideoPosterUrl}
          isUrl
        />
        <InfoCell
          label="CTA"
          value={
            config.ctaLabel
              ? `${config.ctaLabel} → ${config.ctaUrl ?? "—"}`
              : null
          }
        />
      </div>
    </div>
  );
});
