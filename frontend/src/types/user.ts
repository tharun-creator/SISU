export type UserRole = 'super_admin' | 'admin' | 'client' | 'viewer';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  company?: string;
  job_title?: string;
  timezone: string;
  avatar?: string;
  is_active: boolean;
  is_verified: boolean;
  is_priority: boolean;
  created_at: string;
}
