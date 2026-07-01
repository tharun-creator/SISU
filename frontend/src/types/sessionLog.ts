export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SessionLog {
  id: number;
  user_id: number;
  session_date: string;
  session_type: string;
  discussed_items: string[];
  action_items: ActionItem[];
  created_at: string;
  updated_at: string;
}
