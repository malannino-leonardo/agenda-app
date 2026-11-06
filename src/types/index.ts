export type TaskScope = 'projects' | 'freelance' | 'agenda';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'archived';

export interface Client {
  id: string;
  user_id?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  hourly_rate?: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id?: string;
  client_id?: string | null;
  title: string;
  description?: string;
  budget: number;
  quoted_price: number;
  invoiced_amount: number;
  status: ProjectStatus;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export type CalendarPermission = 'view' | 'edit';
export type CalendarRole = 'owner' | CalendarPermission;

export interface PersonProfile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface CalendarMember {
  id: string;
  calendar_id: string;
  user_id: string;
  permission: CalendarPermission;
  created_at: string;
  profile?: PersonProfile | null;
}

export interface CalendarInvite {
  id: string;
  calendar_id: string;
  /** null => open invite link, otherwise restricted to this address */
  email: string | null;
  token: string;
  permission: CalendarPermission;
  revoked?: boolean;
  created_at: string;
}

export interface PendingInvite {
  token: string;
  calendar_id: string;
  calendar_name: string;
  color: string;
  owner_name: string;
  permission: CalendarPermission;
  created_at: string;
}

export interface InviteInfo {
  valid: boolean;
  reason?: string;
  calendar_name?: string;
  color?: string;
  owner_name?: string;
  permission?: CalendarPermission;
  restricted?: boolean;
}

export interface Calendar {
  id: string;
  /** Owner of the calendar */
  user_id?: string;
  name: string;
  color: string;
  description?: string;
  is_default?: boolean;
  /** Accepted collaborators (owner and collaborators can see them) */
  members?: CalendarMember[];
  /** Pending invites (owner only) */
  invites?: CalendarInvite[];
  owner_profile?: PersonProfile | null;
  /** Current user's role on this calendar (computed client-side) */
  role?: CalendarRole;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id?: string;
  calendar_id?: string | null;
  parent_id?: string | null;
  scope: TaskScope;
  project_id?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  due_time?: string | null;
  /** Length of the time block in minutes (calendar only) */
  duration_minutes?: number | null;
  /** Minutes before the start time to fire a reminder */
  remind_before?: number | null;
  order_index: number;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  subtasks?: Task[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export type NavigationModule =
  | 'home'
  | 'agenda'
  | 'tasks'
  | 'projects'
  | 'clients'
  | 'account'
  | 'invite'
  | 'privacy'
  | 'terms'
  | '404';

export type CalendarViewMode = 'day' | 'week' | 'month';

