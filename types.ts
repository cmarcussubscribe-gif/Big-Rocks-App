export interface Activity {
  id: string;
  text: string;
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  activityId: string; // 'SUMMARY' if it's the end of day summary
  activityText: string;
  timestamp: number;
  completed: boolean;
  isSummary?: boolean;
}

export interface AppSettings {
  minNotifications: number;
  maxNotifications: number;
  notificationsToday: number; // The target number generated for today
  lastGeneratedDate: string; // YYYY-MM-DD to track when we generated the count
}

export interface AppState {
  activities: Activity[];
  logs: ActivityLog[];
  settings: AppSettings;
  currentRock: Activity | null; // The activity currently waiting for a Yes/No
  lastActivityId: string | null; // To avoid repeats
  isSummaryPending: boolean; // If true, the next "rock" is actually the summary
  hasSeenOnboarding: boolean; // Tracks if the welcome screen has been shown
}

export enum TimeRange {
  DAY = 'Day',
  MONTH = 'Month',
  THREE_MONTHS = '3 Months',
  SIX_MONTHS = '6 Months',
  YEAR = 'Year',
  ALL_TIME = 'All Time'
}