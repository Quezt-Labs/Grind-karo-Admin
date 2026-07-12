import { useVirtualizer } from "@tanstack/react-virtual";

type UseVirtualizerOptions = Parameters<typeof useVirtualizer>[0];

/** Thin wrapper so React Compiler / eslint can skip TanStack Virtual in one place. */
export function useVirtualList(options: UseVirtualizerOptions) {
  // TanStack Virtual returns unstable function refs by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  return useVirtualizer(options);
}
