import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { inferAudioMimeType } from "@/lib/audioMime";
import { uploadService } from "@/services/uploadService";

function formatAudioTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readDuration(el: HTMLAudioElement): number {
  const d = el.duration;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

interface ChatAudioPlayerProps {
  src: string;
  isFromUser: boolean;
  originalUrl?: string | null;
}

export function ChatAudioPlayer({
  src,
  isFromUser,
  originalUrl = null,
}: ChatAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const attemptedResolveForSrcRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedPlayback, setResolvedPlayback] = useState<{
    baseSrc: string;
    resolvedSrc: string;
  } | null>(null);
  const activeSrc =
    resolvedPlayback && resolvedPlayback.baseSrc === src
      ? resolvedPlayback.resolvedSrc
      : src;
  const resolvedMime = useMemo(() => inferAudioMimeType(activeSrc), [activeSrc]);

  const resolvePlaybackUrl = useCallback(async () => {
    const target = originalUrl || src;
    if (!target || attemptedResolveForSrcRef.current === src) {
      setLoadError("Audio unavailable");
      return;
    }
    attemptedResolveForSrcRef.current = src;
    setResolving(true);
    try {
      const resolved = await uploadService.resolveMedia(target);
      if (resolved !== src) {
        setResolvedPlayback({ baseSrc: src, resolvedSrc: resolved });
        setLoadError(null);
        setLoading(true);
        return;
      }
      setLoadError("Audio unavailable");
    } catch {
      setLoadError("Audio unavailable");
    } finally {
      setResolving(false);
    }
  }, [originalUrl, src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
    setLoadError(null);

    const syncDuration = () => setDuration(readDuration(el));
    const onTime = () => setCurrentTime(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onCanPlay = () => {
      syncDuration();
      setLoading(false);
      setLoadError(null);
    };
    const onLoadStart = () => setLoading(true);
    const onWaiting = () => setLoading(true);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
      setLoading(false);
    };
    const onError = () => {
      setPlaying(false);
      setLoading(false);
      void resolvePlaybackUrl();
    };

    el.addEventListener("loadedmetadata", onCanPlay);
    el.addEventListener("durationchange", syncDuration);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("playing", onCanPlay);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("loadstart", onLoadStart);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("stalled", onWaiting);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.load();

    return () => {
      el.removeEventListener("loadedmetadata", onCanPlay);
      el.removeEventListener("durationchange", syncDuration);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("playing", onCanPlay);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("loadstart", onLoadStart);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("stalled", onWaiting);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, [activeSrc, resolvedMime, resolvePlaybackUrl]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (loadError) {
      setLoadError(null);
      setLoading(true);
      attemptedResolveForSrcRef.current = null;
      el.load();
    }
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    setLoading(true);
    void el.play().then(
      () => {
        setPlaying(true);
        setLoading(false);
        setDuration(readDuration(el));
      },
      () => {
        setPlaying(false);
        setLoading(false);
        setLoadError("Tap to retry");
      },
    );
  }, [loadError, playing]);

  const timeClass = isFromUser
    ? "text-gray-500 dark:text-gray-400"
    : "text-white/90";

  return (
    <div className="flex items-center gap-2.5" style={{ minWidth: "220px" }}>
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline
        className="hidden"
        src={activeSrc}
      >
        {resolvedMime ? <source src={activeSrc} type={resolvedMime} /> : null}
      </audio>

      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80",
          isFromUser
            ? "bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-white"
            : "bg-white/25 text-white",
        )}
        aria-label={loadError ? "Retry audio" : playing ? "Pause" : "Play"}
      >
        {loading && !playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-30"
              fill="none"
            />
            <path
              d="M22 12a10 10 0 0 0-10-10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-90"
              fill="none"
            />
          </svg>
        ) : playing ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          disabled={!!loadError}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = val;
            setCurrentTime(val);
          }}
          className="h-1 w-full cursor-pointer rounded-full disabled:cursor-not-allowed disabled:opacity-50"
          style={{ accentColor: isFromUser ? "#10b981" : "#ffffff" }}
          aria-label="Seek"
        />
        <div
          className={cn(
            "flex justify-between font-mono text-[10px] tabular-nums",
            timeClass,
          )}
        >
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
        {loadError ? (
          <p className={cn("text-[10px] font-medium", timeClass)}>{loadError}</p>
        ) : loading || resolving ? (
          <p className={cn("text-[10px]", timeClass)}>
            {resolving ? "Resolving playback…" : "Loading audio…"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
