import api from "./api";

export interface CoachingProgramRecord {
  program: {
    id: string;
    slug: string;
    name: string;
    kind: "COACHING" | "RETAIL";
    coachingPlanId?: string | null;
    createdAt?: string;
  };
  profile: {
    squatOneRm: number | null;
    benchOneRm: number | null;
    deadliftOneRm: number | null;
    movementSelections: Record<string, string> | null;
    has125kgPlates: boolean;
  } | null;
  intake: {
    squatMax: number | null;
    benchMax: number | null;
    deadliftMax: number | null;
  } | null;
  activeCoachingPlanId?: string | null;
  activeCoachingPlanName?: string | null;
  programMatchesActivePlan?: boolean;
}

export const coachingProgramService = {
  getForUser(userId: string): Promise<CoachingProgramRecord | null> {
    return api
      .get<CoachingProgramRecord | null>(
        `/admin/users/${userId}/coaching-program`,
      )
      .then((r) => r.data);
  },

  createBlank(userId: string): Promise<{ id: string }> {
    return api
      .post<{ id: string }>(`/admin/users/${userId}/coaching-program`, {
        mode: "blank",
      })
      .then((r) => r.data);
  },

  cloneFromTemplate(
    userId: string,
    sourceProgramId: string,
  ): Promise<{ id: string }> {
    return api
      .post<{ id: string }>(`/admin/users/${userId}/coaching-program`, {
        mode: "clone",
        sourceProgramId,
      })
      .then((r) => r.data);
  },

  replaceFromTemplate(
    userId: string,
    sourceProgramId: string,
  ): Promise<{ id: string }> {
    return api
      .post<{ id: string }>(`/admin/users/${userId}/coaching-program/replace`, {
        mode: "clone",
        sourceProgramId,
      })
      .then((r) => r.data);
  },

  replaceBlank(userId: string): Promise<{ id: string }> {
    return api
      .post<{ id: string }>(`/admin/users/${userId}/coaching-program/replace`, {
        mode: "blank",
      })
      .then((r) => r.data);
  },

  updateProfile(
    userId: string,
    programId: string,
    data: {
      squatOneRm?: number | null;
      benchOneRm?: number | null;
      deadliftOneRm?: number | null;
      movementSelections?: Record<string, string>;
      has125kgPlates?: boolean;
    },
  ) {
    return api
      .patch(
        `/admin/users/${userId}/coaching-program/${programId}/profile`,
        data,
      )
      .then((r) => r.data);
  },
};
