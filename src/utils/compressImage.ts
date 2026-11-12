const COMPRESS_THRESHOLD_BYTES = 400 * 1024;
const TARGET_MAX_BYTES = 800 * 1024;
const MAX_DIMENSION = 1600;

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic|heif|bmp|tiff?)$/i;

/** Admin image uploads — includes iOS gallery picks with empty MIME. */
export function looksLikeImageUpload(file: File): boolean {
  if (file.type === "image/svg+xml") return false;
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT_RE.test(file.name);
}

export function isHeicLike(file: File): boolean {
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

function mustEncodeToJpeg(file: File): boolean {
  if (isHeicLike(file)) return true;
  if (!file.type) return IMAGE_EXT_RE.test(file.name);
  if (file.type === "image/gif") return true;
  return /\.gif$/i.test(file.name);
}

async function decodeHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!blob) {
    throw new Error("HEIC conversion returned no image data.");
  }
  const baseName = file.name.replace(/\.[^.]+$/i, "") || "photo";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

async function sourceFileForCanvas(file: File): Promise<File> {
  if (!isHeicLike(file)) return file;
  try {
    return await decodeHeicToJpeg(file);
  } catch {
    return file;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image — try another file."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/** Downscale/compress + HEIC/GIF → allowed upload types before presign/buffered. */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!looksLikeImageUpload(file)) return file;

  const encodeJpeg = mustEncodeToJpeg(file);
  if (!encodeJpeg && file.size <= COMPRESS_THRESHOLD_BYTES) return file;

  const outputType = encodeJpeg
    ? "image/jpeg"
    : file.type === "image/png" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";

  try {
    const source = await sourceFileForCanvas(file);
    const img = await loadImage(source);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      if (source !== file) return source;
      return file;
    }
    ctx.drawImage(img, 0, 0, width, height);

    const quality = outputType === "image/png" ? undefined : 0.88;
    let blob = await canvasToBlob(canvas, outputType, quality ?? 1);
    if (!blob) {
      if (source !== file) return source;
      return file;
    }

    if (outputType !== "image/png" && blob.size > TARGET_MAX_BYTES) {
      for (const q of [0.75, 0.62, 0.5, 0.38]) {
        const attempt = await canvasToBlob(canvas, outputType, q);
        if (!attempt) break;
        blob = attempt;
        if (blob.size <= TARGET_MAX_BYTES) break;
      }
    }

    const convertedFromHeic = isHeicLike(file);
    if (!convertedFromHeic && blob.size >= source.size) {
      return source.type.startsWith("image/") ? source : file;
    }

    const ext =
      outputType === "image/png"
        ? ".png"
        : outputType === "image/webp"
          ? ".webp"
          : ".jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}${ext}`, { type: outputType });
  } catch {
    if (isHeicLike(file)) {
      try {
        return await decodeHeicToJpeg(file);
      } catch {
        throw new Error(
          "Couldn't read this HEIC photo. Pick it again or use JPEG/PNG.",
        );
      }
    }
    if (mustEncodeToJpeg(file)) {
      throw new Error(
        "Couldn't read this photo. Pick a different image and try again.",
      );
    }
    return file;
  }
}
