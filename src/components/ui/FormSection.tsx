interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function FormSection({ title, children, action }: FormSectionProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
