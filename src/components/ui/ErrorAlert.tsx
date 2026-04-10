interface ErrorAlertProps {
  message?: string;
}

export function ErrorAlert({
  message = "Something went wrong. Please try again later.",
}: ErrorAlertProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
      {message}
    </div>
  );
}
