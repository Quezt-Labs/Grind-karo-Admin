import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MovementSelectionPanel } from "@/components/movement/MovementSelectionPanel";
import { paidProgramPurchases } from "@/utils/coachingCapabilities";
import type { Purchase } from "@/types/user";
import { cn } from "@/utils/cn";

type Props = {
  purchases: Purchase[];
  /** When set, coaches can view/reset movement selections per purchased program. */
  userId?: string;
};

export function UserRetailProgramPanel({ purchases, userId }: Props) {
  const navigate = useNavigate();
  const programs = paidProgramPurchases(purchases);
  const [openProgramId, setOpenProgramId] = useState<string | null>(
    programs.length === 1 ? programs[0]!.programId : null,
  );

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
        Retail templates — same prebuilt content for every buyer.
        {userId
          ? " Expand movement selections to reset locked exercise choices."
          : " Opens the program editor directly."}
      </p>
      <ul className="space-y-2">
        {programs.map((p) => {
          const movementOpen = openProgramId === p.programId;
          return (
            <li
              key={p.id}
              className="overflow-hidden rounded-lg border border-gray-100 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {p.programName}
                  </p>
                  <p className="text-xs text-gray-500">{p.programSlug}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setOpenProgramId(movementOpen ? null : p.programId)
                      }
                    >
                      {movementOpen ? (
                        <ChevronUp className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="mr-1 h-3.5 w-3.5" />
                      )}
                      Movement selections
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(`/programs/${p.programSlug}/editor`)
                    }
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Open program
                  </Button>
                </div>
              </div>
              {userId && movementOpen ? (
                <div
                  className={cn(
                    "border-t border-gray-200 px-3 py-4 dark:border-gray-700",
                  )}
                >
                  <MovementSelectionPanel
                    programId={p.programId}
                    userId={userId}
                    mode="select"
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
