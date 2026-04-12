import { cn } from "@/utils/cn";

interface ShimmerProps {
  className?: string;
}

/** Base shimmer bar — use className to set height/width */
export function Shimmer({ className }: ShimmerProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className,
      )}
    />
  );
}

/** Shimmer for stats cards grid (4 cards) */
export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="mt-4 h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

/** Shimmer for a detail page hero banner */
export function HeroBannerSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-gray-200 p-6 dark:bg-gray-700 sm:p-8">
      <div className="space-y-3">
        <div className="h-4 w-20 rounded bg-gray-300 dark:bg-gray-600" />
        <div className="h-8 w-64 rounded bg-gray-300 dark:bg-gray-600" />
        <div className="h-4 w-96 max-w-full rounded bg-gray-300 dark:bg-gray-600" />
      </div>
    </div>
  );
}

/** Shimmer for the program detail page */
export function ProgramDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <HeroBannerSkeleton />
      <StatsCardsSkeleton />
      <div className="flex gap-3">
        <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="animate-pulse rounded-xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-7 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="animate-pulse rounded-xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-4/6 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="animate-pulse rounded-xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shimmer for a page header with back button */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3.5 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

/** Shimmer for a form page */
export function FormPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-4 h-5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
