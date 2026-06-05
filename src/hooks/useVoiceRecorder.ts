import { useCallback, useEffect, useRef, useState } from "react";

export function useVoiceRecorder() {
  const [recording, setRecording] = useState<MediaRecorder | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
      recording?.stop();
    };
  }, [recording]);

  const start = useCallback(async () => {
    if (recording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(200);
    setRecording(rec);
    setElapsedSec(0);
    timerRef.current = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
  }, [recording]);

  const stop = useCallback(async (): Promise<File | null> => {
    if (!recording) return null;
    const rec = recording;
    setRecording(null);
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return new Promise((resolve) => {
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop());
        const mime = (rec.mimeType || "audio/webm").split(";")[0]!;
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        resolve(
          new File([blob], `voice-${Date.now()}.webm`, {
            type: mime,
          }),
        );
      };
      rec.stop();
    });
  }, [recording]);

  const cancel = useCallback(() => {
    if (!recording) return;
    recording.stream.getTracks().forEach((t) => t.stop());
    recording.stop();
    setRecording(null);
    chunksRef.current = [];
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSec(0);
  }, [recording]);

  return { recording, elapsedSec, start, stop, cancel };
}
