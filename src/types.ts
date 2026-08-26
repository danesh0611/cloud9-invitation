export type SelectionStatus = 'SELECTED' | 'WAITLISTED' | 'REJECTED' | 'NOT_SELECTED';

export interface Participant {
  unique_id: string;
  name: string;
  email: string;
  team_name?: string;
  selection_status: SelectionStatus;
  checked_in: boolean;
  check_in_time: string | null;
  created_at: string;
  verification_count: number;
  last_verified_at: string | null;
  college?: string;
  year_of_study?: string;
  phone?: string;
  rsvp_status?: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  college_email?: string;
  personal_email?: string;
}

export interface ScanAttemptLog {
  id: string;
  timestamp: string;
  scanned_id: string;
  status: 'VALID_NOT_CHECKED_IN' | 'ALREADY_CHECKED_IN' | 'INVALID_ID' | 'NOT_SELECTED';
  participant_name?: string;
  notes: string;
}

export interface SystemStats {
  total_imported: number;
  total_selected: number;
  total_checked_in: number;
  total_not_checked_in: number;
  invalid_attempts: number;
  checked_in_rate: number;
}

export interface VerificationResponse {
  valid: boolean;
  status: 'VALID' | 'ALREADY_CHECKED_IN' | 'INVALID' | 'NOT_SELECTED';
  message: string;
  participant?: {
    unique_id: string;
    name: string;
    email: string;
    team_name?: string;
    selection_status: SelectionStatus;
    checked_in: boolean;
    check_in_time: string | null;
    verification_count: number;
    last_verified_at: string | null;
  };
}

export interface CheckInResponse {
  success: boolean;
  already_checked_in?: boolean;
  message: string;
  participant?: Participant;
  timestamp?: string;
}
