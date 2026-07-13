export type MessageType = "TEXT" | "IMAGE" | "AUDIO";

export interface ParentMessageSnippet {
  id: string;
  contentPreview: string | null;
  senderId: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  senderId: string;
  content: string | null;
  type: MessageType;
  mediaUrl: string | null;
  parentMessageId?: string | null;
  parent?: ParentMessageSnippet | null;
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
  parentMessageId?: string;
}
