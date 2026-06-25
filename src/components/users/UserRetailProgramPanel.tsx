import { useNavigate } from "react-router-dom";
import { BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { paidProgramPurchases } from "@/utils/coachingCapabilities";
import type { Purchase } from "@/types/user";

type Props = {
  purchases: Purchase[];
};

export function UserRetailProgramPanel({ purchases }: Props) {
  const navigate = useNavigate();
  const programs = paidProgramPurchases(purchases);

  if (programs.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Purchased programs
        </h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Retail templates — same prebuilt content for every buyer. Opens the
        program editor directly.
      </p>
      <ul className="space-y-2">
        {programs.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white">
                {p.programName}
              </p>
              <p className="text-xs text-gray-500">{p.programSlug}</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/programs/${p.programSlug}/editor`)}
            >
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Open program
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
