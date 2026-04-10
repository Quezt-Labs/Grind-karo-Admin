interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function FormSection({ title, children, action }: FormSectionProps) {
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800">
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
