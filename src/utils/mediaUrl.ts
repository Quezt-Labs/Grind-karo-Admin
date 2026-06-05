const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mpeg|3gp)(\?|#|$)/i;

export function isVideoMediaUrl(url: string): boolean {
  if (VIDEO_EXT_RE.test(url)) return true;
  try {
    return VIDEO_EXT_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
