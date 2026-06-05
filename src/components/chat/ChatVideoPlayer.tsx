import { useCallback, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface ChatVideoPlayerProps {
  src: string;
  isFromUser: boolean;
}

export function ChatVideoPlayer({ src, isFromUser }: ChatVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [expanded, setExpanded] = useState(false);

  const enterFullscreen = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }
      const webkit = el as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      };
      webkit.webkitEnterFullscreen?.();
    } catch {
      setExpanded(true);
    }
  }, []);

  return (
    <>
      <div
        className={cn(
          "relative w-full max-w-xs overflow-hidden",
          isFromUser ? "bg-black/5 dark:bg-black/20" : "bg-black/30",
        )}
      >
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="block max-h-64 w-full object-contain"
        />
        <button
          type="button"
          onClick={() => void enterFullscreen()}
          className={cn(
            "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow-md",
            isFromUser
              ? "bg-white/90 text-gray-800"
              : "bg-white/90 text-gray-900",
          )}
          title="Fullscreen"
          aria-label="Fullscreen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
