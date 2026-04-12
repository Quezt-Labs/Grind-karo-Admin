import { Link } from "react-router-dom";
import { Home, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      {/* Dumbbell icon as the zero in 4-0-4 */}
      <div className="flex items-center gap-3">
        <span className="text-7xl font-black tracking-tight text-primary-500 sm:text-8xl">
          4
        </span>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30 sm:h-20 sm:w-20">
          <Dumbbell className="h-9 w-9 text-primary-500 sm:h-11 sm:w-11" />
        </div>
        <span className="text-7xl font-black tracking-tight text-primary-500 sm:text-8xl">
          4
        </span>
      </div>

      <h2 className="mt-6 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
        Lost in the Gym
      </h2>
      <p className="mt-2 max-w-sm text-center text-gray-500 dark:text-gray-400">
        This page skipped leg day and doesn't exist. Let's get you back to your
        workout station.
      </p>

      <Link to="/dashboard" className="mt-8">
        <Button variant="primary">
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
