/**
 * Shared payload types for notification channels.
 * Eliminates duplicated inline parameter types across notifiers.
 */

export interface AlertPayload {
  ruleName: string;
  message: string;
  timestamp: string;
}

export interface DailyReportPayload {
  date: string;
  totalDownload: string;
  totalUpload: string;
  deviceCount: number;
  networkQuality: string;
  avgSignal: number;
}
