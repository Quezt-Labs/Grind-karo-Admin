import type { Column } from "@/types/dashboard";
import { CoachingSetupStatusBadge } from "./CoachingSetupStatusBadge";
import type { CoachingSetupRow } from "./usersConstants";

export const coachingSetupColumns: Column<CoachingSetupRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  { key: "planName", header: "Plan", sortable: true },
  {
    key: "setupStatus",
    header: "Status",
    sortable: true,
    render: (value) => <CoachingSetupStatusBadge status={value as string} />,
  },
  { key: "subscribedAt", header: "Subscribed", sortable: true },
  { key: "expiresAt", header: "Expires", sortable: true },
];
