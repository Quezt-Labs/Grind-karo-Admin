export const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export const PENDING_STATE_KEY = "__pending_state__";
export const PENDING_STATE_LABEL = "State not selected";

export type AthleteLocationSource = "state" | "pending" | "none";

export function resolveAthleteLocation(
  city?: string | null,
  state?: string | null,
): { groupKey: string; groupLabel: string; source: AthleteLocationSource } {
  const explicitState = state?.trim();
  if (explicitState) {
    return {
      groupKey: explicitState,
      groupLabel: explicitState,
      source: "state",
    };
  }

  if (city?.trim()) {
    return {
      groupKey: PENDING_STATE_KEY,
      groupLabel: PENDING_STATE_LABEL,
      source: "pending",
    };
  }

  return {
    groupKey: "__unknown__",
    groupLabel: "Location not set",
    source: "none",
  };
}

export function formatAthleteLocation(
  city?: string | null,
  state?: string | null,
): string {
  const c = city?.trim();
  const s = state?.trim();
  if (c && s) return `${c}, ${s}`;
  return c || s || "—";
}
