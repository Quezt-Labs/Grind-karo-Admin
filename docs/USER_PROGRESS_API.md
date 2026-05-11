Weekly User Progress — Implementation Guide
Reference for the User and Admin apps to implement the weekly physique progress tracking.

Core Rules
Constraint: Users can only upload a progress image once every 7 days.
Data: Each entry includes a mandatory image URL and optional notes/bodyweight.
Access: Users see their own history; Admins can see history for any specific user.
User API

1. Upload Progress
   POST /progress/upload

Request Body:

{
"imageUrl": "https://d109f0isvw4b71.cloudfront.net/images/...",
"notes": "Feeling stronger this week!",
"weight": 78.5
}
Error (400): If an upload was made within the last 7 days, the API returns: { "message": "You can only upload progress once a week", "error": "Bad Request", "statusCode": 400 } 2. View My History
GET /progress/history?limit=50&offset=0

Returns a list of all past progress entries, newest first.

Admin API (Trainer)

1. View User Progress
   GET /admin/progress/:userId?limit=50&offset=0

Allows trainers to see the progress photos and notes for a specific client.

FE Implementation Notes
Upload Flow: Like the Chat system, use the /upload API first to get the imageUrl, then POST to /progress/upload.
Weight Unit: Weight is stored as a string but accepted as a number in the DTO. It represents kg.
Wait State: If the user has already uploaded this week, the "Upload" button should ideally be disabled in the UI based on the createdAt timestamp of their latest history entry.
