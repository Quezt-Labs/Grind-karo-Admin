const PAGE_SCROLL_SELECTOR = ".admin-page-scroll";
const BULK_BAR_SELECTOR = "[data-form-check-bulk-bar]";

export function measureFormCheckScrollOffset(): number {
  const bulk = document.querySelector<HTMLElement>(BULK_BAR_SELECTOR);
  if (!bulk) return 12;

  const container = document.querySelector<HTMLElement>(PAGE_SCROLL_SELECTOR);
  const bulkRect = bulk.getBoundingClientRect();
  if (!container) return bulkRect.height + 12;

  const containerTop = container.getBoundingClientRect().top;
  if (bulkRect.bottom > containerTop + 8) {
    return bulkRect.bottom - containerTop + 8;
  }
  return 12;
}

/** Scroll the admin main content container to an element (not window). */
export function scrollToPageElement(
  el: HTMLElement,
  opts?: { offset?: number; behavior?: ScrollBehavior },
) {
  const container = document.querySelector<HTMLElement>(PAGE_SCROLL_SELECTOR);
  const offset = opts?.offset ?? measureFormCheckScrollOffset();
  const behavior = opts?.behavior ?? "auto";

  if (!container) {
    el.scrollIntoView({ behavior, block: "start" });
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const top = container.scrollTop + (elRect.top - containerRect.top) - offset;
  container.scrollTo({ top: Math.max(0, top), behavior });
}
