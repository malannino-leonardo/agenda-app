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

export interface Task {
  id: string;
  user_id?: string;
  parent_id?: string | null;
  scope: TaskScope;
  project_id?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
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
  | 'privacy'
  | 'terms'
  | '404';

export type CalendarViewMode = 'day' | 'week' | 'month';

