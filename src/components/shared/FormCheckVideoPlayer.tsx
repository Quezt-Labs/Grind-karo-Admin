import { useCallback, useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/utils/cn";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface FormCheckVideoPlayerProps {
  src: string;
  className?: string;
  videoClassName?: string;
  /** Compact toolbar for nested cards (workout log sets). */
  compact?: boolean;
}

export function FormCheckVideoPlayer({
  src,
  className,
  videoClassName,
  compact = false,
}: FormCheckVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pipSupported, setPipSupported] = useState(false);

  useEffect(() => {
    setPipSupported(
      typeof document !== "undefined" &&
        "pictureInPictureEnabled" in document &&
        document.pictureInPictureEnabled,
    );
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.playbackRate = speed;
  }, [speed]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(
      0,
      Math.min(el.duration || 0, el.currentTime + delta),
    );
  }, []);

  const handleScrub = useCallback((value: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = value;
    setCurrentTime(value);
  }, []);

  const enterPiP = useCallback(async () => {
    const el = videoRef.current;
    if (!el?.requestPictureInPicture) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
      }
    } catch {
      /* user cancelled or browser blocked */
    }
  }, []);

  const enterFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (video.requestFullscreen) {
        await video.requestFullscreen();
        return;
      }
      const webkit = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      };
      if (webkit.webkitEnterFullscreen) {
        webkit.webkitEnterFullscreen();
        return;
      }
      if (container?.requestFullscreen) {
        await container.requestFullscreen();
      }
    } catch {
      /* ignored */
    }
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(5);
          break;
        case "j":
          e.preventDefault();
          seekBy(-10);
          break;
        case "l":
          e.preventDefault();
          seekBy(10);
          break;
        default:
          break;
      }
    },
    [seekBy, togglePlay],
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "overflow-hidden rounded-none bg-black outline-none ring-indigo-500 focus-visible:ring-2",
        className,
      )}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        className={cn(
          "aspect-video w-full bg-black object-contain",
          videoClassName,
        )}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />

      <div
        className={cn(
          "border-t border-white/10 bg-gray-950/95 text-white",
          compact ? "px-2 py-1.5" : "px-3 py-2",
        )}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5 translate-x-0.5" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => handleScrub(Number(e.target.value))}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-indigo-500"
            aria-label="Seek"
          />

          <span className="shrink-0 font-mono text-[10px] tabular-nums text-gray-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            Speed
          </span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                speed === s
                  ? "bg-indigo-600 text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/15",
              )}
            >
              {s}x
            </button>
          ))}

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const el = videoRef.current;
                if (el) {
                  el.currentTime = 0;
                  el.pause();
                  setPlaying(false);
                }
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
              title="Restart"
              aria-label="Restart"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            {pipSupported && (
              <button
                type="button"
                onClick={() => void enterPiP()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
                title="Picture in picture"
                aria-label="Picture in picture"
              >
                <PictureInPicture2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => void enterFullscreen()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
              title="Fullscreen"
              aria-label="Fullscreen"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {!compact && (
          <p className="mt-1.5 hidden text-[10px] text-gray-600 sm:block">
            Space play/pause · ←/→ ±5s · J/L ±10s
          </p>
        )}
      </div>
    </div>
  );
}
