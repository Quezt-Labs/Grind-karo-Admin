export interface AdminUserPushStatus {
  pushConfigured: boolean;
  deviceCount: number;
  workoutRemindersEnabled: boolean;
  chatNotificationsEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  timezone: string;
  lastSubscribedAt: string | null;
}

export interface AdminSendTestPushResponse {
  sent: number;
  deviceCount: number;
}
