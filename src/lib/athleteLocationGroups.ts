import type { AssignedAthleteListItem } from "@/types/athleteAssignment";
import {
  PENDING_STATE_KEY,
  PENDING_STATE_LABEL,
  resolveAthleteLocation,
  type AthleteLocationSource,
} from "@/lib/indianStates";

export const UNKNOWN_LOCATION_KEY = "__unknown__";
export const UNKNOWN_LOCATION_LABEL = "Location not set";

export interface LocationSummary {
  total: number;
  statesCount: number;
  withState: number;
  pendingState: number;
  missingLocation: number;
}

export interface StateAthleteGroup {
  state: string;
  stateKey: string;
  athletes: AssignedAthleteListItem[];
  cities: string[];
  source: AthleteLocationSource;
}

export function buildLocationSummary(
  items: AssignedAthleteListItem[],
): LocationSummary {
  let withState = 0;
  let pendingState = 0;
  let missingLocation = 0;
  const stateKeys = new Set<string>();

  for (const item of items) {
    const resolved = resolveAthleteLocation(item.city, item.state);
    if (resolved.source === "state") {
      withState += 1;
      stateKeys.add(resolved.groupKey);
    } else if (resolved.source === "pending") {
      pendingState += 1;
      stateKeys.add(PENDING_STATE_KEY);
    } else {
      missingLocation += 1;
      stateKeys.add(UNKNOWN_LOCATION_KEY);
    }
  }

  return {
    total: items.length,
    statesCount: stateKeys.size,
    withState,
    pendingState,
    missingLocation,
  };
}

export function groupAthletesByState(
  items: AssignedAthleteListItem[],
): StateAthleteGroup[] {
  const map = new Map<
    string,
    { athletes: AssignedAthleteListItem[]; source: AthleteLocationSource }
  >();

  for (const item of items) {
    const resolved = resolveAthleteLocation(item.city, item.state);
    const existing = map.get(resolved.groupKey);
    if (existing) {
      existing.athletes.push(item);
    } else {
      map.set(resolved.groupKey, {
        athletes: [item],
        source: resolved.source,
      });
    }
  }

  const groups: StateAthleteGroup[] = [];

  for (const [key, { athletes, source }] of map) {
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

    let label = key;
    if (key === UNKNOWN_LOCATION_KEY) label = UNKNOWN_LOCATION_LABEL;
    if (key === PENDING_STATE_KEY) label = PENDING_STATE_LABEL;

    groups.push({
      stateKey: key,
      state: label,
      athletes,
      cities,
      source,
    });
  }

  groups.sort((a, b) => {
    if (a.stateKey === UNKNOWN_LOCATION_KEY) return 1;
    if (b.stateKey === UNKNOWN_LOCATION_KEY) return -1;
    if (a.stateKey === PENDING_STATE_KEY) return 1;
    if (b.stateKey === PENDING_STATE_KEY) return -1;
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
