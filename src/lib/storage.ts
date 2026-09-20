import { Client, Project, Task } from '../types';

const STORAGE_KEYS = {
  CLIENTS: 'agenda_clients',
  PROJECTS: 'agenda_projects',
  TASKS: 'agenda_tasks',
};

export const loadStoredData = () => {
  try {
    const clientsStr = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const projectsStr = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const tasksStr = localStorage.getItem(STORAGE_KEYS.TASKS);

    return {
      clients: clientsStr ? (JSON.parse(clientsStr) as Client[]) : [],
      projects: projectsStr ? (JSON.parse(projectsStr) as Project[]) : [],
      tasks: tasksStr ? (JSON.parse(tasksStr) as Task[]) : [],
    };
  } catch {
    return {
      clients: [],
      projects: [],
      tasks: [],
    };
  }
};

export const saveStoredData = (
  clients: Client[],
  projects: Project[],
  tasks: Task[]
) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch {
    // Silent fail for storage limits
  }
};
