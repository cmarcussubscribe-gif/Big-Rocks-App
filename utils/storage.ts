import { Activity, ActivityLog, AppSettings } from '../types';

const KEYS = {
  ACTIVITIES: 'bigrocks_activities',
  LOGS: 'bigrocks_logs',
  SETTINGS: 'bigrocks_settings',
  STATE_CURRENT: 'bigrocks_current_rock',
  STATE_LAST_ID: 'bigrocks_last_id',
  STATE_SUMMARY: 'bigrocks_summary_pending',
  HAS_SEEN_ONBOARDING: 'bigrocks_has_seen_onboarding'
};

export const loadInitialData = () => {
  const activities: Activity[] = JSON.parse(localStorage.getItem(KEYS.ACTIVITIES) || '[]');
  const logs: ActivityLog[] = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
  
  const defaultSettings: AppSettings = {
    minNotifications: 3,
    maxNotifications: 8,
    notificationsToday: 5,
    lastGeneratedDate: new Date().toISOString().split('T')[0]
  };

  const settings: AppSettings = JSON.parse(localStorage.getItem(KEYS.SETTINGS) || JSON.stringify(defaultSettings));
  const currentRock: Activity | null = JSON.parse(localStorage.getItem(KEYS.STATE_CURRENT) || 'null');
  const lastActivityId: string | null = localStorage.getItem(KEYS.STATE_LAST_ID);
  const isSummaryPending: boolean = JSON.parse(localStorage.getItem(KEYS.STATE_SUMMARY) || 'false');
  const hasSeenOnboarding: boolean = JSON.parse(localStorage.getItem(KEYS.HAS_SEEN_ONBOARDING) || 'false');

  return { activities, logs, settings, currentRock, lastActivityId, isSummaryPending, hasSeenOnboarding };
};

export const saveData = (
  activities: Activity[], 
  logs: ActivityLog[], 
  settings: AppSettings, 
  currentRock: Activity | null,
  lastActivityId: string | null,
  isSummaryPending: boolean,
  hasSeenOnboarding: boolean
) => {
  localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  localStorage.setItem(KEYS.STATE_CURRENT, JSON.stringify(currentRock));
  if (lastActivityId) localStorage.setItem(KEYS.STATE_LAST_ID, lastActivityId);
  else localStorage.removeItem(KEYS.STATE_LAST_ID);
  localStorage.setItem(KEYS.STATE_SUMMARY, JSON.stringify(isSummaryPending));
  localStorage.setItem(KEYS.HAS_SEEN_ONBOARDING, JSON.stringify(hasSeenOnboarding));
};