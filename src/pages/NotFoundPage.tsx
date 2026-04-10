import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">
        404
      </h1>
      <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
        Page not found
      </h2>
      <p className="mt-2 text-gray-500 dark:text-gray-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button variant="primary">
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
