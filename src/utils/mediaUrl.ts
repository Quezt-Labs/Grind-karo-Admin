const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mpeg|3gp)(\?|#|$)/i;
const VIDEO_PATH_RE = /\/video\//i;

export function isVideoMediaUrl(url: string): boolean {
  if (VIDEO_EXT_RE.test(url)) return true;
  try {
    const parsed = new URL(url);
    if (VIDEO_EXT_RE.test(parsed.pathname)) return true;
    if (VIDEO_PATH_RE.test(parsed.pathname)) return true;
    const contentType =
      parsed.searchParams.get("Content-Type") ??
      parsed.searchParams.get("content-type");
    if (contentType?.startsWith("video/")) return true;
  } catch {
    return false;
  }
  return false;
}

/** Chat messages use type IMAGE for both photos and videos — detect video from URL. */
export function isChatVideoMessage(msg: {
  type: string;
  mediaUrl?: string | null;
}): boolean {
  if (msg.type === "VIDEO" && msg.mediaUrl) return true;
  if (msg.type === "IMAGE" && msg.mediaUrl && isVideoMediaUrl(msg.mediaUrl)) {
    return true;
  }
  return false;
}
