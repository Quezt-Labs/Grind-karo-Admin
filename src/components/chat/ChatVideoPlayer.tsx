import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";

interface ChatVideoPlayerProps {
  src: string;
  isFromUser: boolean;
}

export function ChatVideoPlayer({ src, isFromUser }: ChatVideoPlayerProps) {
  return (
    <FormCheckVideoPlayer src={src} variant="inline" isFromUser={isFromUser} />
  );
}
