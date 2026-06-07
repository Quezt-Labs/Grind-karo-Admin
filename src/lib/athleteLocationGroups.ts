import type { AssignedAthleteListItem } from "@/types/athleteAssignment";

export const UNKNOWN_LOCATION_KEY = "__unknown__";
export const UNKNOWN_LOCATION_LABEL = "Location not set";

export interface LocationSummary {
  total: number;
  statesCount: number;
  withState: number;
  missingCount: number;
}

export interface StateAthleteGroup {
  state: string;
  stateKey: string;
  athletes: AssignedAthleteListItem[];
  cities: string[];
}

export function buildLocationSummary(
  items: AssignedAthleteListItem[],
): LocationSummary {
  const withState = items.filter((a) => a.state?.trim()).length;
  const uniqueStates = new Set(
    items.map((a) => a.state?.trim()).filter(Boolean) as string[],
  );

  return {
    total: items.length,
    statesCount: uniqueStates.size,
    withState,
    missingCount: items.length - withState,
  };
}

export function groupAthletesByState(
  items: AssignedAthleteListItem[],
): StateAthleteGroup[] {
  const map = new Map<string, AssignedAthleteListItem[]>();

  for (const item of items) {
    const key = item.state?.trim() || UNKNOWN_LOCATION_KEY;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  const groups: StateAthleteGroup[] = [];

  for (const [key, athletes] of map) {
    athletes.sort((a, b) =>
      (a.athleteName ?? a.athleteEmail).localeCompare(
        b.athleteName ?? b.athleteEmail,
      ),
    );

    const cities = [
      ...new Set(
        athletes.map((a) => a.city?.trim()).filter(Boolean) as string[],
      ),
    ].sort((a, b) => a.localeCompare(b));

    groups.push({
      stateKey: key,
      state: key === UNKNOWN_LOCATION_KEY ? UNKNOWN_LOCATION_LABEL : key,
      athletes,
      cities,
    });
  }

  groups.sort((a, b) => {
    if (a.stateKey === UNKNOWN_LOCATION_KEY) return 1;
    if (b.stateKey === UNKNOWN_LOCATION_KEY) return -1;
    return a.state.localeCompare(b.state);
  });

  return groups;
}

export function filterGroupsByState(
  groups: StateAthleteGroup[],
  stateKey: string | null,
): StateAthleteGroup[] {
  if (!stateKey) return groups;
  return groups.filter((group) => group.stateKey === stateKey);
}
