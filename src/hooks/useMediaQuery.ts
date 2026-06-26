import { useSyncExternalStore } from "react";

function subscribe(query: string, onStoreChange: () => void) {
  const mq = window.matchMedia(query);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getServerSnapshot() {
  return true;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribe(query, onStoreChange),
    () => window.matchMedia(query).matches,
    getServerSnapshot,
  );
}

/** Tailwind `lg` breakpoint — 1024px and up */
export function useIsLgUp() {
  return useMediaQuery("(min-width: 1024px)");
}
