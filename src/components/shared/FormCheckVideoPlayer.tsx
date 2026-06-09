import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  TimeSlider,
  useMediaRemote,
  useMediaState,
  type MediaPlayerInstance,
} from "@vidstack/react";
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
const TIME_UPDATE_MS = 250;

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

function useThrottledCurrentTime(
  playerRef: React.RefObject<MediaPlayerInstance | null>,
  enabled: boolean,
) {
  const [currentTime, setCurrentTime] = useState(0);
  const scrubbing = useMediaState("seeking", playerRef);

  useEffect(() => {
    if (!enabled || scrubbing) return;

    const tick = () => {
      const time = playerRef.current?.state.currentTime ?? 0;
      setCurrentTime(time);
    };

    tick();
    const id = window.setInterval(tick, TIME_UPDATE_MS);
    return () => window.clearInterval(id);
  }, [enabled, playerRef, scrubbing]);

  return { currentTime, scrubbing };
}

function PlayerControls({
  playerRef,
  compact,
  isInline,
  srcReady,
  onActivate,
  onToggleExpanded,
}: {
  playerRef: React.RefObject<MediaPlayerInstance | null>;
  compact: boolean;
  isInline: boolean;
  srcReady: boolean;
  onActivate: () => void;
  onToggleExpanded: () => void;
}) {
  const remote = useMediaRemote(playerRef);
  const paused = useMediaState("paused", playerRef);
  const duration = useMediaState("duration", playerRef);
  const volume = useMediaState("volume", playerRef);
  const muted = useMediaState("muted", playerRef);
  const waiting = useMediaState("waiting", playerRef);
  const ended = useMediaState("ended", playerRef);
  const error = useMediaState("error", playerRef);
  const speed = useMediaState("playbackRate", playerRef);
  const pipSupported =
    typeof document !== "undefined" &&
    "pictureInPictureEnabled" in document &&
    document.pictureInPictureEnabled;

  const { currentTime } = useThrottledCurrentTime(playerRef, srcReady);
  const loading = srcReady && waiting && !error;
  const controlsDisabled = !srcReady || Boolean(error);

  const togglePlay = useCallback(() => {
    if (!srcReady) {
      onActivate();
      return;
    }
    if (paused || ended) {
      if (ended) remote.seek(0);
      remote.play();
    } else {
      remote.pause();
    }
  }, [ended, onActivate, paused, remote, srcReady]);

  const toggleMute = useCallback(() => {
    if (!srcReady) return;
    if (muted || volume === 0) remote.unmute();
    else remote.mute();
  }, [muted, remote, srcReady, volume]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      if (!srcReady) return;
      remote.changeVolume(value);
      if (value > 0 && muted) remote.unmute();
    },
    [muted, remote, srcReady],
  );

  const enterPiP = useCallback(() => {
    if (!srcReady) return;
    remote.togglePictureInPicture();
  }, [remote, srcReady]);

  const enterFullscreen = useCallback(() => {
    if (!srcReady) return;
    if (isInline) {
      onToggleExpanded();
      return;
    }
    void remote.enterFullscreen();
  }, [isInline, onToggleExpanded, remote, srcReady]);

  const retryLoad = useCallback(() => {
    remote.startLoading();
  }, [remote]);

  return (
    <>
      {!srcReady && (
        <button
          type="button"
          onClick={onActivate}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 transition-colors hover:bg-black/40"
          aria-label="Load and play video"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Play className="h-6 w-6 translate-x-0.5 text-white" />
          </span>
        </button>
      )}

      {loading && (
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
            disabled={controlsDisabled}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40"
            aria-label={paused || ended ? "Play" : "Pause"}
          >
            {paused || ended ? (
              <Play className="h-3.5 w-3.5 translate-x-0.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
          </button>

          {srcReady && !error ? (
            <TimeSlider.Root className="group relative flex h-4 min-w-0 flex-1 items-center">
              <TimeSlider.Track className="relative h-1 w-full rounded-full bg-white/20">
                <TimeSlider.TrackFill className="absolute inset-y-0 left-0 rounded-full bg-indigo-500" />
                <TimeSlider.Progress className="absolute inset-y-0 left-0 rounded-full bg-white/30" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-indigo-400 opacity-0 transition-opacity group-hover:opacity-100 data-[focus]:opacity-100" />
            </TimeSlider.Root>
          ) : (
            <div className="h-1 min-w-0 flex-1 rounded-full bg-white/10" />
          )}

          <span className="shrink-0 font-mono text-[10px] tabular-nums text-gray-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            disabled={controlsDisabled}
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
            disabled={controlsDisabled}
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
                  onClick={() => srcReady && remote.changePlaybackRate(s)}
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
                  remote.seek(0);
                  remote.pause();
                }}
                disabled={controlsDisabled}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40"
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
                disabled={controlsDisabled}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40"
                title="Picture in picture"
                aria-label="Picture in picture"
              >
                <PictureInPicture2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={enterFullscreen}
              disabled={controlsDisabled && !isInline}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40"
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
    </>
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
  const playerRef = useRef<MediaPlayerInstance>(null);
  const pendingPlayRef = useRef(false);
  const remote = useMediaRemote(playerRef);

  const [srcReady, setSrcReady] = useState(eager);
  const [expanded, setExpanded] = useState(false);

  const isInline = variant === "inline";
  const activeSrc = srcReady ? src : undefined;

  const activate = useCallback(() => {
    pendingPlayRef.current = true;
    setSrcReady(true);
  }, []);

  const paused = useMediaState("paused", playerRef);
  const canPlay = useMediaState("canPlay", playerRef);

  useEffect(() => {
    if (!pendingPlayRef.current || !canPlay) return;
    pendingPlayRef.current = false;
    remote.play();
  }, [canPlay, remote]);

  useEffect(() => {
    if (eager) return;

    const el = containerRef.current;
    if (!el || !srcReady) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting && !paused) {
          remote.pause();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, paused, remote, srcReady]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (!srcReady) activate();
          else if (paused) remote.play();
          else remote.pause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          remote.seek(
            Math.max(0, (playerRef.current?.state.currentTime ?? 0) - 5),
          );
          break;
        case "ArrowRight":
          e.preventDefault();
          remote.seek((playerRef.current?.state.currentTime ?? 0) + 5);
          break;
        case "j":
          e.preventDefault();
          remote.seek(
            Math.max(0, (playerRef.current?.state.currentTime ?? 0) - 10),
          );
          break;
        case "l":
          e.preventDefault();
          remote.seek((playerRef.current?.state.currentTime ?? 0) + 10);
          break;
        case "m":
          e.preventDefault();
          if (playerRef.current?.state.muted) remote.unmute();
          else remote.mute();
          break;
        default:
          break;
      }
    },
    [activate, paused, remote, srcReady],
  );

  const shellClassName = cn(
    expanded && isInline
      ? "fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      : "outline-none ring-indigo-500 focus-visible:ring-2",
    !expanded &&
      (isInline
        ? cn(
            "relative w-full max-w-xs rounded-none",
            isFromUser ? "bg-black/5 dark:bg-black/20" : "bg-black/30",
          )
        : "rounded-none bg-black"),
    className,
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={shellClassName}
      onClick={expanded && isInline ? () => setExpanded(false) : undefined}
    >
      {expanded && isInline && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="absolute right-4 top-4 z-[60] rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div
        className={cn(
          "overflow-hidden",
          expanded && isInline
            ? "max-h-[85vh] max-w-[95vw] rounded-lg bg-black"
            : "w-full",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <MediaPlayer
          ref={playerRef}
          src={activeSrc}
          playsInline
          preload="none"
          load={eager ? "visible" : "play"}
          className={cn(
            "group relative w-full",
            isInline && !expanded && "max-w-xs",
          )}
        >
          <MediaProvider
            mediaProps={{
              className: cn(
                isInline
                  ? "block max-h-64 w-full bg-black object-contain"
                  : "aspect-video w-full bg-black object-contain",
                expanded && isInline && "max-h-[70vh]",
                videoClassName,
              ),
            }}
          />
          {poster ? (
            <Poster
              src={poster}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : null}

          <PlayerControls
            playerRef={playerRef}
            compact={compact}
            isInline={isInline}
            srcReady={srcReady}
            onActivate={activate}
            onToggleExpanded={() => setExpanded((v) => !v)}
          />
        </MediaPlayer>
      </div>
    </div>
  );
}
