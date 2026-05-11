Chat System — Frontend Integration Guide
This document covers the integration of the simple REST-based chat system for both the Client App and the Admin/Trainer Dashboard.

🏗️ Data Models (TypeScript)
Use these interfaces for consistent typing across the frontend.

export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO';

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
📱 Client App Integration

1. The Chat Timeline
   Endpoint: GET /chat/history?limit=50&offset=0
   Behavior: Fetches the thread between the user and the trainers.
   Auto-Read: Fetching this history automatically marks any trainer messages as "read" server-side.
   Polling: To simulate a real-time feel, poll this endpoint every 5-10 seconds when the chat screen is active.
2. Sending Messages
   Endpoint: POST /chat/send
   Text: Send { "content": "Hello", "type": "TEXT" }.
   Media (Images/Audio):
   First, use the /upload API to get a signed URL and upload the file to S3.
   Once you have the final URL, call /chat/send with { "mediaUrl": "https://...", "type": "IMAGE" }.
   👨‍🏫 Admin/Trainer Dashboard Integration
3. Global Notification Badge
   Endpoint: GET /admin/chat/unread-total
   Returns: { "count": number }
   Purpose: Shows a total number of unread messages from all clients in the sidebar/header.
   Polling: Every 60 seconds.
4. The User List (Inbox)
   Endpoint: GET /admin/chat/inbox
   Purpose: Display a list of all clients with active conversations.
   UI Tip: Use unreadCount > 0 to highlight users who are waiting for a reply.
   Polling: Poll this every 30-60 seconds while the trainer is on the main chat dashboard.
5. The Conversation Thread
   Endpoint: GET /admin/chat/history/:userId
   Auto-Read: Marks all messages sent by the user as read.
   Sorting: Results are returned newest first. Reverse them in the UI for a standard bottom-up chat view.
6. Replying to a User
   Endpoint: POST /admin/chat/send
   Requirement: Unlike the client, the admin must specify the userId in the payload to ensure the message lands in the correct thread.
   {
   "userId": "uuid-of-the-client",
   "content": "I've checked your logs. Great job!",
   "type": "TEXT"
   }
   🖼️ Handling Media Uploads (Images/Audio)
   Media is handled in two steps: first, upload the file to storage; second, send the resulting URL to the chat.

Step 1: Upload to Storage
We use Presigned POST URLs for media. This is the most efficient way to upload large files (like audio or high-res photos) as the browser sends bytes directly to S3.

A. Request a Presigned URL
POST /upload/presign (Admin only for now, or use POST /upload for small files)

Request Body:

{
"filename": "feedback_voice_note.m4a",
"contentType": "audio/mp4",
"sizeBytes": 1240000
}
Response (PresignedUploadResponseDto):

{
"url": "https://grindkaro-media.s3.ap-south-1.amazonaws.com/",
"fields": {
"Content-Type": "audio/mp4",
"key": "audio/11052026/random-key.m4a",
"Policy": "...",
"X-Amz-Signature": "..."
// ... other AWS fields
},
"cloudfrontUrl": "https://d109f0isvw4b71.cloudfront.net/audio/11052026/random-key.m4a"
}
B. Upload the file to S3
Perform a standard multipart/form-data POST to the url returned above.

Append all keys/values from fields to your FormData object.
Crucial: Append the file blob last as the file field.
Note: Do NOT send your JWT Authorization header to S3.
const formData = new FormData();
// 1. Add fields first
Object.entries(fields).forEach(([key, value]) => {
formData.append(key, value);
});
// 2. Add file last
formData.append('file', fileBlob);

// 3. POST directly to S3
await fetch(url, { method: 'POST', body: formData });
Step 2: Send Message to Chat
Once the S3 upload is successful, use the cloudfrontUrl from Step 1 to send the message.

Example: Sending an Audio Clip POST /chat/send

{
"type": "AUDIO",
"mediaUrl": "https://d109f0isvw4b71.cloudfront.net/audio/11052026/random-key.m4a",
"content": "Voice feedback on your squat form"
}
🛠️ Implementation Checklist
Polling: Implement a useInterval or similar hook to fetch history periodically.
Media Uploads: Ensure the /upload flow is working before attempting to send IMAGE or AUDIO messages.
Read State: Use readAt === null on the latest message in the inbox to show unread indicators.
Optimistic UI: When a user clicks "send", append the message to the local list immediately while the request is pending to make the app feel faster.
Bottom-Scroll: Ensure the chat window automatically scrolls to the bottom when new messages arrive or when the user first opens the thread. thread.
