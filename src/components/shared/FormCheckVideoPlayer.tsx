import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
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
  poster?: string;
  /** Compact toolbar for nested cards (workout log sets). */
  compact?: boolean;
  /** Chat bubble layout — smaller video, optional expanded overlay. */
  variant?: "default" | "inline";
  isFromUser?: boolean;
  /** Disable lazy loading (e.g. upload preview). */
  eager?: boolean;
}

export function FormCheckVideoPlayer(props: FormCheckVideoPlayerProps) {
  return (
    <FormCheckVideoPlayerInner
      key={`${props.src}-${props.eager ?? false}`}
      {...props}
    />
  );
}

function FormCheckVideoPlayerInner({
  src,
  className,
  videoClassName,
  poster,
  compact = false,
  variant = "default",
  isFromUser = false,
  eager = false,
}: FormCheckVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeSrc, setActiveSrc] = useState(() => (eager ? src : ""));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(() => eager && Boolean(src));
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pipSupported] = useState(
    () =>
      typeof document !== "undefined" &&
      "pictureInPictureEnabled" in document &&
      document.pictureInPictureEnabled,
  );

  const isInline = variant === "inline";

  useEffect(() => {
    if (eager) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setActiveSrc(src);
          setLoading(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src, eager]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el || !activeSrc) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [activeSrc]);

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

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    if (value > 0) setMuted(false);
  }, []);

  const retryLoad = useCallback(() => {
    setError(false);
    setLoading(true);
    const el = videoRef.current;
    if (el) {
      el.load();
    }
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
      if (isInline) {
        setExpanded(true);
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
      if (isInline) setExpanded(true);
    }
  }, [isInline]);

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
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    },
    [seekBy, toggleMute, togglePlay],
  );

  const videoElement = (
    <div className="relative">
      <video
        ref={videoRef}
        src={activeSrc || undefined}
        poster={poster}
        playsInline
        preload={activeSrc ? "metadata" : "none"}
        className={cn(
          isInline
            ? "block max-h-64 w-full bg-black object-contain"
            : "aspect-video w-full bg-black object-contain",
          videoClassName,
        )}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration ?? 0);
          setLoading(false);
        }}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />

      {loading && activeSrc && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-4 text-center">
          <p className="text-xs text-gray-300">Video load nahi hua</p>
          <button
            type="button"
            onClick={retryLoad}
            className="rounded-md bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-white/25"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );

  const controls = (
    <div
      className={cn(
        "border-t border-white/10 bg-gray-950/95 text-white",
        compact || isInline ? "px-2 py-1.5" : "px-3 py-2",
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!activeSrc || error}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40"
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
          disabled={!activeSrc || error}
          className="h-1 min-w-0 flex-1 cursor-pointer accent-indigo-500 disabled:opacity-40"
          aria-label="Seek"
        />

        <span className="shrink-0 font-mono text-[10px] tabular-nums text-gray-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={toggleMute}
          disabled={!activeSrc || error}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          disabled={!activeSrc || error}
          className="h-1 w-16 cursor-pointer accent-indigo-500 disabled:opacity-40"
          aria-label="Volume"
        />

        {!isInline && (
          <>
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
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {!isInline && (
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
          )}
          {!isInline && pipSupported && (
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

      {!compact && !isInline && (
        <p className="mt-1.5 hidden text-[10px] text-gray-600 sm:block">
          Space play/pause · ←/→ ±5s · J/L ±10s · M mute
        </p>
      )}
    </div>
  );

  return (
    <>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          "overflow-hidden outline-none ring-indigo-500 focus-visible:ring-2",
          isInline
            ? cn(
                "relative w-full max-w-xs rounded-none",
                isFromUser ? "bg-black/5 dark:bg-black/20" : "bg-black/30",
              )
            : "rounded-none bg-black",
          className,
        )}
      >
        {videoElement}
        {controls}
      </div>

      {expanded && isInline && (
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
          <div
            className="max-h-[90vh] max-w-[95vw] overflow-hidden rounded-lg bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <FormCheckVideoPlayer
              src={src}
              eager
              className="max-h-[85vh] max-w-[95vw]"
            />
          </div>
        </div>
      )}
    </>
  );
}
