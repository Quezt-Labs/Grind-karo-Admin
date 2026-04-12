import { Zap, Target } from "lucide-react";
import type { Program } from "@/types/program";

interface ProgramInfoCardsProps {
  program: Program;
}

function NumberedList({
  items,
  colorClasses,
}: {
  items: string[];
  colorClasses: {
    bg: string;
    text: string;
  };
}) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
        >
          <span
            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${colorClasses.bg} ${colorClasses.text}`}
          >
            {i + 1}
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ProgramInfoCards({ program }: ProgramInfoCardsProps) {
  const highlights = program.highlights.filter(Boolean);
  const goals = program.goals.filter(Boolean);

  return (
    <>
      {/* Description + Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            About this program
          </h3>
          <p className="leading-relaxed text-gray-700 dark:text-gray-300">
            {program.description}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Details
          </h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Slug</dt>
              <dd className="mt-0.5 font-mono text-gray-800 dark:text-gray-200">
                {program.slug}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Category</dt>
              <dd className="mt-0.5 font-medium text-gray-800 dark:text-gray-200">
                {program.category}
              </dd>
            </div>
            {program.createdAt && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                  {new Date(program.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            {program.updatedAt && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">
                  Last Updated
                </dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                  {new Date(program.updatedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Highlights & Goals */}
      {(highlights.length > 0 || goals.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {highlights.length > 0 && (
            <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <Zap className="h-4 w-4 text-primary-500" />
                Highlights
              </h3>
              <NumberedList
                items={highlights}
                colorClasses={{
                  bg: "bg-primary-50 dark:bg-primary-900/20",
                  text: "text-primary-600 dark:text-primary-400",
                }}
              />
            </div>
          )}

          {goals.length > 0 && (
            <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <Target className="h-4 w-4 text-green-500" />
                Goals
              </h3>
              <NumberedList
                items={goals}
                colorClasses={{
                  bg: "bg-green-50 dark:bg-green-900/20",
                  text: "text-green-600 dark:text-green-400",
                }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
