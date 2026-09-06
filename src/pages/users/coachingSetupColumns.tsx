import type { Column } from "@/types/dashboard";
import { CoachingSetupStatusBadge } from "./CoachingSetupStatusBadge";
import type { CoachingSetupRow } from "./usersConstants";
import { formatAdminPhone } from "@/utils/phoneStatus";

export const coachingSetupColumns: Column<CoachingSetupRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  {
    key: "phone",
    header: "Phone",
    sortable: true,
    render: (value) => {
      const { label, missing } = formatAdminPhone(value as string | null);
      return (
        <span
          className={
            missing
              ? "text-amber-700 dark:text-amber-400"
              : undefined
          }
        >
          {label}
        </span>
      );
    },
  },
  { key: "planName", header: "Plan", sortable: true },
  { key: "city", header: "City", sortable: true },
  { key: "state", header: "State", sortable: true },
  {
    key: "setupStatus",
    header: "Status",
    sortable: true,
    render: (value) => <CoachingSetupStatusBadge status={value as string} />,
  },
  { key: "subscribedAt", header: "Subscribed", sortable: true },
  { key: "expiresAt", header: "Expires", sortable: true },
];
