export type MeetingStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'rescheduled'
  | 'reschedule_proposed'
  | 'reschedule_requested';

export type MeetingPriority = 'low' | 'normal' | 'medium' | 'high' | 'urgent';

export interface Meeting {
  id: number;
  client_id: number;
  client_name: string;
  client_email: string;
  client_is_priority: boolean;
  title: string;
  description?: string;
  reason?: string;
  meeting_type: string;
  status: MeetingStatus;
  priority: MeetingPriority;
  start_time: string;
  end_time: string;
  display_date: string;
  display_time: string;
  duration_minutes: number;
  google_event_id?: string;
  meet_link?: string;
  notes?: string;
  admin_notes?: string;
  preferred_communication: string;
  phone?: string;
  otter_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AvailabilitySlot {
  id: number;
  start_time: string;
  end_time: string;
  recurring: boolean;
  day_of_week?: number;
}
export interface CalendarSignal {
  signal: 'green' | 'yellow' | 'red';
  custom_slots: string[];
}
