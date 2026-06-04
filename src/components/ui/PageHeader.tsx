interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {children ? (
        <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {children}
        </div>
      ) : null}
    </div>
  );
}
