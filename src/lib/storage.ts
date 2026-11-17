import { Client, Project, Task, Calendar } from '../types';
import { cleanEmail, safeColor } from './security';

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
  members: [],
  invites: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const loadStoredData = () => {
  try {
    const clientsStr = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const projectsStr = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const tasksStr = localStorage.getItem(STORAGE_KEYS.TASKS);
    const calendarsStr = localStorage.getItem(STORAGE_KEYS.CALENDARS);

    // localStorage is user-editable: only accept arrays of plain objects, and re-validate
    // the fields that end up in styles/links before they reach the UI.
    const parseList = <T,>(raw: string | null): T[] => {
      if (!raw) return [];
      const v = JSON.parse(raw);
      return Array.isArray(v)
        ? (v.filter((x) => x && typeof x === 'object' && !Array.isArray(x)).slice(0, 10000) as T[])
        : [];
    };
    const calendars = parseList<Calendar>(calendarsStr).map((c) => ({ ...c, color: safeColor(c.color) }));
    return {
      clients: parseList<Client>(clientsStr).map((c) => ({ ...c, email: cleanEmail(c.email) || undefined })),
      projects: parseList<Project>(projectsStr),
      tasks: parseList<Task>(tasksStr),
      calendars: calendars.length ? calendars : [DEFAULT_CALENDAR],
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

export const clearStoredData = () => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    // Silent fail
  }
};
