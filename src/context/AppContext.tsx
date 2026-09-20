import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Client,
  Project,
  Task,
  NavigationModule,
  TaskScope,
} from '../types';
import { loadStoredData, saveStoredData } from '../lib/storage';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AppContextType {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  activeModule: NavigationModule;
  setActiveModule: (module: NavigationModule) => void;
  navigateToHome: () => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Task Operations
  toggleTaskCompletion: (taskId: string) => void;
  addTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  getOrganizedTasks: (scope?: TaskScope, projectId?: string | null) => {
    pendingTasks: Task[];
    completedTasks: Task[];
  };

  // Client Operations
  addClient: (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Project Operations
  addProject: (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

const getModuleFromPath = (path: string): NavigationModule => {
  const clean = path.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!clean) return 'home';
  if (clean === 'agenda') return 'agenda';
  if (clean === 'tasks') return 'tasks';
  if (clean === 'projects' || clean === 'freelance') return 'projects';
  if (clean === 'clients') return 'clients';
  if (clean === 'account') return 'account';
  if (clean === 'privacy') return 'privacy';
  if (clean === 'terms') return 'terms';
  if (clean === '404') return '404';
  return '404';
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const initialData = useMemo(() => loadStoredData(), []);

  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);

  const [activeModule, setActiveModuleState] = useState<NavigationModule>(() => {
    return getModuleFromPath(window.location.pathname);
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const setActiveModule = useCallback((mod: NavigationModule) => {
    setActiveModuleState(mod);
    const targetPath = mod === 'home' ? '/' : `/${mod}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, []);

  const navigateToHome = useCallback(() => {
    setActiveModuleState('home');
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  // Listen for browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveModuleState(getModuleFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch Supabase data when authenticated
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;

    try {
      const [clientsRes, projectsRes, tasksRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('order_index', { ascending: true }),
      ]);

      if (clientsRes.data) setClients(clientsRes.data as Client[]);
      if (projectsRes.data) setProjects(projectsRes.data as Project[]);
      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    } catch {
      // Fallback to local storage
    }
  }, [user]);

  useEffect(() => {
    if (user && isSupabaseConfigured && supabase) {
      fetchSupabaseData();
    } else if (!user) {
      setClients([]);
      setProjects([]);
      setTasks([]);
    }
  }, [user, fetchSupabaseData]);

  // Save to localStorage whenever data changes (offline cache)
  useEffect(() => {
    saveStoredData(clients, projects, tasks);
  }, [clients, projects, tasks]);

  // Toggle Task Completion
  const toggleTaskCompletion = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const isNowCompleted = target.status !== 'completed';
    const now = new Date().toISOString();

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            status: isNowCompleted ? 'completed' : 'pending',
            completed_at: isNowCompleted ? now : null,
            updated_at: now,
          };
        }
        if (t.parent_id === taskId && isNowCompleted) {
          return {
            ...t,
            status: 'completed',
            completed_at: now,
            updated_at: now,
          };
        }
        return t;
      })
    );

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('tasks')
        .update({
          status: isNowCompleted ? 'completed' : 'pending',
          completed_at: isNowCompleted ? now : null,
          updated_at: now,
        })
        .eq('id', taskId)
        .eq('user_id', user.id)
        .then(() => {});
    }
  };

  // Add Task
  const addTask = (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    const newId = 'tsk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const newTask: Task = {
      ...data,
      id: newId,
      user_id: user?.id,
      created_at: now,
      updated_at: now,
      completed_at: data.status === 'completed' ? now : null,
    };

    setTasks((prev) => [newTask, ...prev]);

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('tasks')
        .insert({
          id: newId,
          user_id: user.id,
          parent_id: data.parent_id || null,
          scope: data.scope,
          project_id: data.project_id || null,
          title: data.title,
          description: data.description || null,
          status: data.status,
          priority: data.priority,
          due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
          order_index: data.order_index || 0,
        })
        .then(() => {});
    }
  };

  // Update Task
  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              ...updates,
              updated_at: now,
              completed_at:
                updates.status === 'completed'
                  ? now
                  : updates.status !== undefined
                  ? null
                  : t.completed_at,
            }
          : t
      )
    );

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: now,
        })
        .eq('id', taskId)
        .eq('user_id', user.id)
        .then(() => {});
    }
  };

  // Delete Task
  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId && t.parent_id !== taskId));

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id)
        .then(() => {});
    }
  };

  // Client Operations
  const addClient = (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    const newId = 'cli-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const newClient: Client = {
      ...data,
      id: newId,
      user_id: user?.id,
      created_at: now,
      updated_at: now,
    };

    setClients((prev) => [newClient, ...prev]);

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('clients')
        .insert({
          id: newId,
          user_id: user.id,
          name: data.name,
          company: data.company || null,
          email: data.email || null,
          phone: data.phone || null,
          hourly_rate: data.hourly_rate || 0,
          currency: data.currency || 'EUR',
          notes: data.notes || null,
        })
        .then(() => {});
    }
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    const now = new Date().toISOString();
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: now } : c))
    );

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('clients')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', user.id)
        .then(() => {});
    }
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setProjects((prev) =>
      prev.map((p) => (p.client_id === id ? { ...p, client_id: undefined } : p))
    );

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(() => {});
    }
  };

  // Project Operations
  const addProject = (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const newId = 'proj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const newProject: Project = {
      ...data,
      id: newId,
      user_id: user?.id,
      created_at: now,
      updated_at: now,
    };

    setProjects((prev) => [newProject, ...prev]);

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('projects')
        .insert({
          id: newId,
          user_id: user.id,
          client_id: data.client_id || null,
          title: data.title,
          description: data.description || null,
          budget: data.budget || 0,
          quoted_price: data.quoted_price || 0,
          invoiced_amount: data.invoiced_amount || 0,
          status: data.status,
          deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        })
        .then(() => {});
    }
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: now } : p))
    );

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('projects')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .eq('user_id', user.id)
        .then(() => {});
    }
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTasks((prev) => prev.filter((t) => t.project_id !== id));

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(() => {});
    }
  };

  // Organized Hierarchical Tasks
  const getOrganizedTasks = (scope?: TaskScope, projectId?: string | null) => {
    let filtered = tasks;

    if (scope) {
      filtered = filtered.filter((t) => t.scope === scope);
    }
    if (projectId) {
      filtered = filtered.filter((t) => t.project_id === projectId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const rootTasks = filtered.filter((t) => !t.parent_id);
    const subtasks = tasks.filter((t) => Boolean(t.parent_id));

    const attachSubtasks = (parent: Task): Task => {
      const children = subtasks.filter((sub) => sub.parent_id === parent.id);
      return {
        ...parent,
        subtasks: children.sort((a, b) => a.order_index - b.order_index),
      };
    };

    const tree = rootTasks.map(attachSubtasks);
    const pendingTasks = tree.filter((t) => t.status !== 'completed');
    const completedTasks = tree.filter((t) => t.status === 'completed');

    return { pendingTasks, completedTasks };
  };

  const value = {
    clients,
    projects,
    tasks,
    activeModule,
    setActiveModule,
    navigateToHome,
    selectedProjectId,
    setSelectedProjectId,
    searchQuery,
    setSearchQuery,
    toggleTaskCompletion,
    addTask,
    updateTask,
    deleteTask,
    getOrganizedTasks,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
