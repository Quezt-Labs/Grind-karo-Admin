function fileNameFromVideoUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").pop();
    if (base?.includes(".")) return decodeURIComponent(base);
  } catch {
    /* ignore */
  }
  return `form-check-${Date.now()}.mp4`;
}

/** Download athlete form-check video; falls back to new tab if fetch is blocked. */
export async function downloadFormCheckVideo(
  videoUrl: string,
  fileName?: string,
): Promise<void> {
  const name = fileName?.trim() || fileNameFromVideoUrl(videoUrl);

  try {
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(videoUrl, "_blank", "noopener,noreferrer");
  }
}
