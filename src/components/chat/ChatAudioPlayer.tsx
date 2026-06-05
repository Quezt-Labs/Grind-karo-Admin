import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

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
}

export function ChatAudioPlayer({ src, isFromUser }: ChatAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const syncDuration = () => setDuration(readDuration(el));
    const onTime = () => setCurrentTime(el.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    el.addEventListener("loadedmetadata", syncDuration);
    el.addEventListener("durationchange", syncDuration);
    el.addEventListener("canplay", syncDuration);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    el.load();

    return () => {
      el.removeEventListener("loadedmetadata", syncDuration);
      el.removeEventListener("durationchange", syncDuration);
      el.removeEventListener("canplay", syncDuration);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    void el.play().then(
      () => {
        setPlaying(true);
        setDuration(readDuration(el));
      },
      () => setPlaying(false),
    );
  }, [playing]);

  const timeClass = isFromUser
    ? "text-gray-500 dark:text-gray-400"
    : "text-white/90";

  return (
    <div className="flex items-center gap-2.5" style={{ minWidth: "220px" }}>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80",
          isFromUser
            ? "bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-white"
            : "bg-white/25 text-white",
        )}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
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
          onChange={(e) => {
            const val = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = val;
            setCurrentTime(val);
          }}
          className="h-1 w-full cursor-pointer rounded-full"
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
      </div>
    </div>
  );
}
