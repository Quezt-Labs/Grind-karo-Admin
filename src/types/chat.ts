export type MessageType = "TEXT" | "IMAGE" | "AUDIO";

export interface ChatMessage {
  id: string;
  userId: string;
  senderId: string;
  content: string | null;
  type: MessageType;
  mediaUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ChatInboxItem {
  userId: string;
  userName: string | null;
  userEmail: string;
  latestMessage: ChatMessage;
  unreadCount: number;
}

export interface SendMessagePayload {
  userId: string;
  content?: string;
  type: MessageType;
  mediaUrl?: string;
}
