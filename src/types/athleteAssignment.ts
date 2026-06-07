export interface AssistantCoach {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  assignedAthleteCount: number;
}

export interface AthleteAssignment {
  id: string;
  athleteId: string;
  assistantCoachId: string | null;
  assistantCoach: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  personalCoachingEnabled: boolean;
  formCheckEnabled: boolean;
  assignedBy: string | null;
  assignedAt: string;
  updatedAt: string;
}

export interface UpsertAthleteAssignmentPayload {
  assistantCoachId?: string | null;
  personalCoachingEnabled?: boolean;
  formCheckEnabled?: boolean;
}

export interface AssignedAthleteListItem {
  athleteId: string;
  athleteName: string | null;
  athleteEmail: string;
  city: string | null;
  state: string | null;
  programsPurchased: string[];
  personalCoachingEnabled: boolean;
  formCheckEnabled: boolean;
  assignedAt: string;
}

export interface AssignedAthletesResponse {
  total: number;
  items: AssignedAthleteListItem[];
}

export interface CoachAthleteSummaryResponse {
  athlete: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    city?: string | null;
    state?: string | null;
    spreadsheetId?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  assignment: AthleteAssignment | null;
}
