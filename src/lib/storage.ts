import { Client, Project, Task, Calendar } from '../types';

const STORAGE_KEYS = {
  CLIENTS: 'agenda_clients',
  PROJECTS: 'agenda_projects',
  TASKS: 'agenda_tasks',
  CALENDARS: 'agenda_calendars',
};

const DEFAULT_CALENDAR: Calendar = {
  id: 'default-main',
  name: 'Personal',
  color: '#6366f1',
  description: 'Main personal calendar',
  is_default: true,
  shares: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const loadStoredData = () => {
  try {
    const clientsStr = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const projectsStr = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const tasksStr = localStorage.getItem(STORAGE_KEYS.TASKS);
    const calendarsStr = localStorage.getItem(STORAGE_KEYS.CALENDARS);

    return {
      clients: clientsStr ? (JSON.parse(clientsStr) as Client[]) : [],
      projects: projectsStr ? (JSON.parse(projectsStr) as Project[]) : [],
      tasks: tasksStr ? (JSON.parse(tasksStr) as Task[]) : [],
      calendars: calendarsStr ? (JSON.parse(calendarsStr) as Calendar[]) : [DEFAULT_CALENDAR],
    };
  } catch {
    return {
      clients: [],
      projects: [],
      tasks: [],
      calendars: [DEFAULT_CALENDAR],
    };
  }
};

export const saveStoredData = (
  clients: Client[],
  projects: Project[],
  tasks: Task[],
  calendars?: Calendar[]
) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    if (calendars) {
      localStorage.setItem(STORAGE_KEYS.CALENDARS, JSON.stringify(calendars));
    }
  } catch {
    // Silent fail for storage limits
  }
};
