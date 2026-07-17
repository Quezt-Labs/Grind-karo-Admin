import { Fragment, type ReactNode } from "react";
import { cn } from "@/utils/cn";

/** Match http(s) URLs and www. hosts; trailing punctuation is stripped. */
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?'")\]}>]/gi;

function normalizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

const DEFAULT_LINK_CLASS =
  "break-all font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300";

export function linkifyText(
  text: string,
  linkClassName = DEFAULT_LINK_CLASS,
): ReactNode[] {
  if (!text) return [];
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    const href = normalizeHref(raw);
    if (href) {
      nodes.push(
        <a
          key={`link-${start}-${raw}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          onClick={(e) => e.stopPropagation()}
        >
          {raw}
        </a>,
      );
    } else {
      nodes.push(raw);
    }
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.map((node, i) => <Fragment key={i}>{node}</Fragment>);
}

/** Plain text with auto-linked http(s)/www URLs. */
export function LinkifiedText({
  text,
  className,
  linkClassName,
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  linkClassName?: string;
  as?: "p" | "span" | "div";
}) {
  return (
    <Tag className={cn("whitespace-pre-wrap wrap-break-word", className)}>
      {linkifyText(text, linkClassName)}
    </Tag>
  );
}
