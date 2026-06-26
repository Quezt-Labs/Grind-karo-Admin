import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  message?: string;
}

export function EmptyState({
  icon,
  message = "No data found",
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800 sm:p-12">
      {icon && (
        <div className="mx-auto mb-4 text-gray-300 dark:text-gray-600">
          {icon}
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
