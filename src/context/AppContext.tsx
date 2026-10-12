import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Client,
  Project,
  Task,
  NavigationModule,
  TaskScope,
  Calendar,
  CalendarShare,
} from '../types';
import { loadStoredData, saveStoredData } from '../lib/storage';
import { useAuth, getCachedAuthUser } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  checkRateLimit,
  recordRateLimitAttempt,
  RATE_LIMIT_CONFIGS,
} from '../lib/rateLimit';

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

  // Guest Shared Calendar Access
  guestEmail: string | null;
  setGuestEmail: (email: string | null) => void;
  isGuestAccessModalOpen: boolean;
  setIsGuestAccessModalOpen: (open: boolean) => void;
  openGuestAccess: () => void;
  validateGuestEmailAccess: (email: string) => { success: boolean; calendar?: Calendar };

  // Calendar Operations
  calendars: Calendar[];
  activeCalendarId: string | 'all';
  setActiveCalendarId: (id: string | 'all') => void;
  addCalendar: (data: { name: string; color: string; description?: string }) => Calendar;
  updateCalendar: (id: string, updates: Partial<Calendar>) => void;
  deleteCalendar: (id: string) => void;
  shareCalendar: (calendarId: string, email: string, permission: 'view' | 'edit') => void;
  removeCalendarShare: (calendarId: string, shareId: string) => void;

  // Task Operations
  toggleTaskCompletion: (taskId: string) => void;
  addTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  getOrganizedTasks: (scope?: TaskScope, projectId?: string | null, calendarId?: string | null) => {
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

  // Synchronization status & manual refresh
  isDataLoading: boolean;
  refreshData: () => Promise<void>;
}

const getModuleFromPath = (path: string, isLoggedIn = false): NavigationModule => {
  const clean = path.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (clean === 'home') return 'home';
  if (!clean) return isLoggedIn ? 'agenda' : 'home';
  if (clean === 'agenda' || clean === 'dashboard') return 'agenda';
  if (clean === 'tasks') return 'tasks';
  if (clean === 'projects' || clean === 'freelance') return 'projects';
  if (clean === 'clients') return 'clients';
  if (clean === 'account') return 'account';
  if (clean === 'privacy') return 'privacy';
  if (clean === 'terms') return 'terms';
  if (clean === '404') return '404';
  return '404';
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const toSafeISODate = (val?: string | null): string | null => {
  if (!val || !val.trim()) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const toValidUUIDOrNull = (val?: string | null): string | null => {
  if (!val || !val.trim()) return null;
  const trimmed = val.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const initialData = useMemo(() => loadStoredData(), []);

  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>(() => {
    return initialData.calendars && initialData.calendars.length > 0
      ? initialData.calendars
      : [
          {
            id: 'default-main',
            name: 'Personal',
            color: '#6366f1',
            description: 'Main personal calendar',
            is_default: true,
            shares: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
  });
  const [activeCalendarId, setActiveCalendarId] = useState<string | 'all'>('all');

  // Guest Shared Calendar Access
  const [guestEmail, setGuestEmailState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('agenda_guest_email');
    } catch {
      return null;
    }
  });

  const [isGuestAccessModalOpen, setIsGuestAccessModalOpen] = useState(false);

  const setGuestEmail = useCallback((email: string | null) => {
    setGuestEmailState(email);
    try {
      if (email) {
        localStorage.setItem('agenda_guest_email', email);
      } else {
        localStorage.removeItem('agenda_guest_email');
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const openGuestAccess = useCallback(() => {
    setIsGuestAccessModalOpen(true);
  }, []);

  const validateGuestEmailAccess = useCallback(
    (email: string): { success: boolean; calendar?: Calendar } => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return { success: false };

      const matchedCal = calendars.find((cal) =>
        (cal.shares || []).some((s) => s.email.toLowerCase() === cleanEmail)
      );

      if (matchedCal) {
        setGuestEmail(cleanEmail);
        setActiveCalendarId(matchedCal.id);
        return { success: true, calendar: matchedCal };
      }

      return { success: false };
    },
    [calendars, setGuestEmail]
  );

  const [activeModule, setActiveModuleState] = useState<NavigationModule>(() => {
    const cachedAuth = getCachedAuthUser();
    const isLogged = Boolean(cachedAuth.user);
    const mod = getModuleFromPath(window.location.pathname, isLogged);
    if (isLogged && mod === 'agenda' && (window.location.pathname === '/' || window.location.pathname === '')) {
      window.history.replaceState(null, '', '/agenda');
    }
    return mod;
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
    setActiveModule('home');
  }, [setActiveModule]);

  // Listen for browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveModuleState(getModuleFromPath(window.location.pathname, Boolean(user)));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Fetch Supabase data when authenticated with verified session
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;

    try {
      setIsDataLoading(true);

      // Verify or wait for active authenticated session in Supabase client
      const { data: sessionData } = await supabase.auth.getSession();
      let activeSession = sessionData?.session || session;

      if (!activeSession) {
        // Wait a short moment in case supabase is restoring token from storage
        await new Promise((resolve) => setTimeout(resolve, 250));
        const retry = await supabase.auth.getSession();
        activeSession = retry.data?.session || session;
      }

      if (!activeSession) {
        console.warn('Supabase session not yet available; preserving cached data');
        setIsDataLoading(false);
        return;
      }

      const [clientsRes, projectsRes, tasksRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('user_id', user.id).order('order_index', { ascending: true }),
      ]);

      if (clientsRes.error) {
        console.warn('Notice loading clients:', clientsRes.error.message);
      } else if (clientsRes.data) {
        setClients(clientsRes.data as Client[]);
      }

      if (projectsRes.error) {
        console.warn('Notice loading projects:', projectsRes.error.message);
      } else if (projectsRes.data) {
        setProjects(projectsRes.data as Project[]);
      }

      if (tasksRes.error) {
        console.warn('Notice loading tasks:', tasksRes.error.message);
      } else if (tasksRes.data) {
        setTasks(tasksRes.data as Task[]);
      }

      // Attempt to load calendars if table exists
      try {
        const { data: calsData, error: calsError } = await supabase
          .from('calendars')
          .select('*, shares:calendar_shares(*)')
          .order('created_at', { ascending: true });
        if (!calsError && calsData && calsData.length > 0) {
          setCalendars(calsData as Calendar[]);
        }
      } catch {
        // Table may not exist yet, keep local calendars
      }
    } catch (err) {
      console.warn('Notice fetching Supabase data:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [user, session]);

  useEffect(() => {
    if (user && isSupabaseConfigured && supabase) {
      fetchSupabaseData();
    } else if (!user) {
      setClients([]);
      setProjects([]);
      setTasks([]);
    }
  }, [user, session, fetchSupabaseData]);

  // Re-sync when window regains focus (e.g. returning to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user && isSupabaseConfigured && supabase) {
        fetchSupabaseData();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, fetchSupabaseData]);

  // Save to localStorage whenever data changes (offline cache) - ONLY when user is authenticated
  useEffect(() => {
    if (user) {
      saveStoredData(clients, projects, tasks, calendars);
    }
  }, [user, clients, projects, tasks, calendars]);

  // Toggle Task Completion
  const toggleTaskCompletion = (taskId: string) => {
    if (!user) {
      console.warn('Guest users have read-only access. Sign in to modify tasks.');
      return;
    }
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
        .then(({ error }) => {
          if (error) console.error('Supabase tasks toggle completion error:', error);
        });
    }
  };

  // Add Task
  const addTask = (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      console.warn('Guest users cannot create tasks.');
      return;
    }
    const rateLimitCheck = checkRateLimit('action_task_create', RATE_LIMIT_CONFIGS.TASK_CREATE);
    if (!rateLimitCheck.allowed) {
      console.warn(`Task creation rate limit exceeded. Please wait ${rateLimitCheck.retryAfterSeconds}s.`);
      return;
    }
    recordRateLimitAttempt('action_task_create', RATE_LIMIT_CONFIGS.TASK_CREATE);

    const newId = generateUUID();
    const now = new Date().toISOString();
    const safeDueDate = toSafeISODate(data.due_date);
    const newTask: Task = {
      ...data,
      id: newId,
      due_date: safeDueDate || undefined,
      due_time: data.due_time || undefined,
      calendar_id: data.calendar_id || undefined,
      user_id: user?.id,
      created_at: now,
      updated_at: now,
      completed_at: data.status === 'completed' ? now : null,
    };

    setTasks((prev) => [newTask, ...prev]);

    if (isSupabaseConfigured && supabase && user) {
      const dbScope = (data.scope === 'projects' ? 'freelance' : data.scope) || 'agenda';
      const insertPayload: Record<string, unknown> = {
        id: newId,
        user_id: user.id,
        parent_id: toValidUUIDOrNull(data.parent_id),
        scope: dbScope,
        project_id: toValidUUIDOrNull(data.project_id),
        title: data.title,
        description: data.description || null,
        status: data.status || 'pending',
        priority: data.priority || 'medium',
        due_date: safeDueDate,
        order_index: data.order_index || 0,
      };
      if (data.due_time) insertPayload.due_time = data.due_time;
      if (toValidUUIDOrNull(data.calendar_id)) insertPayload.calendar_id = data.calendar_id;

      const client = supabase;
      client
        .from('tasks')
        .insert(insertPayload)
        .then(({ error }) => {
          if (error) {
            if (error.message?.includes('column')) {
              delete insertPayload.due_time;
              delete insertPayload.calendar_id;
              client.from('tasks').insert(insertPayload);
            } else {
              console.error('Supabase tasks insert error:', error);
            }
          }
        });
    }
  };

  // Update Task
  const updateTask = (taskId: string, updates: Partial<Task>) => {
    if (!user) {
      console.warn('Guest users cannot edit tasks.');
      return;
    }
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
      const dbUpdates: Record<string, unknown> = {
        ...updates,
        updated_at: now,
      };
      if (dbUpdates.scope === 'projects') {
        dbUpdates.scope = 'freelance';
      }
      if ('parent_id' in dbUpdates) {
        dbUpdates.parent_id = toValidUUIDOrNull(dbUpdates.parent_id as string);
      }
      if ('project_id' in dbUpdates) {
        dbUpdates.project_id = toValidUUIDOrNull(dbUpdates.project_id as string);
      }
      if ('calendar_id' in dbUpdates) {
        dbUpdates.calendar_id = toValidUUIDOrNull(dbUpdates.calendar_id as string);
      }
      if ('due_date' in dbUpdates) {
        dbUpdates.due_date = toSafeISODate(dbUpdates.due_date as string);
      }

      const client = supabase;
      client
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) {
            if (error.message?.includes('column')) {
              delete dbUpdates.due_time;
              delete dbUpdates.calendar_id;
              client.from('tasks').update(dbUpdates).eq('id', taskId).eq('user_id', user.id);
            } else {
              console.error('Supabase tasks update error:', error);
            }
          }
        });
    }
  };

  // Delete Task
  const deleteTask = (taskId: string) => {
    if (!user) {
      console.warn('Guest users cannot delete tasks.');
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId && t.parent_id !== taskId));

    if (isSupabaseConfigured && supabase && user) {
      supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Supabase tasks delete error:', error);
        });
    }
  };

  // Client Operations
  const addClient = (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    const rateLimitCheck = checkRateLimit('action_client_create', RATE_LIMIT_CONFIGS.CLIENT_CREATE);
    if (!rateLimitCheck.allowed) {
      console.warn(`Client creation rate limit exceeded. Please wait ${rateLimitCheck.retryAfterSeconds}s.`);
      return;
    }
    recordRateLimitAttempt('action_client_create', RATE_LIMIT_CONFIGS.CLIENT_CREATE);

    const newId = generateUUID();
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
          hourly_rate: Number(data.hourly_rate) || 0,
          currency: data.currency || 'EUR',
          notes: data.notes || null,
        })
        .then(({ error }) => {
          if (error) console.error('Supabase clients insert error:', error);
        });
    }
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    const now = new Date().toISOString();
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: now } : c))
    );

    if (isSupabaseConfigured && supabase && user) {
      const dbUpdates: Record<string, unknown> = {
        ...updates,
        updated_at: now,
      };
      if ('hourly_rate' in dbUpdates && dbUpdates.hourly_rate !== undefined) {
        dbUpdates.hourly_rate = Number(dbUpdates.hourly_rate) || 0;
      }

      supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Supabase clients update error:', error);
        });
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
        .then(({ error }) => {
          if (error) console.error('Supabase clients delete error:', error);
        });
    }
  };

  // Project Operations
  const addProject = (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const rateLimitCheck = checkRateLimit('action_project_create', RATE_LIMIT_CONFIGS.PROJECT_CREATE);
    if (!rateLimitCheck.allowed) {
      console.warn(`Project creation rate limit exceeded. Please wait ${rateLimitCheck.retryAfterSeconds}s.`);
      return;
    }
    recordRateLimitAttempt('action_project_create', RATE_LIMIT_CONFIGS.PROJECT_CREATE);

    const newId = generateUUID();
    const now = new Date().toISOString();
    const safeDeadline = toSafeISODate(data.deadline);
    const newProject: Project = {
      ...data,
      id: newId,
      deadline: safeDeadline || undefined,
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
          client_id: toValidUUIDOrNull(data.client_id),
          title: data.title,
          description: data.description || null,
          budget: Number(data.budget) || 0,
          quoted_price: Number(data.quoted_price) || 0,
          invoiced_amount: Number(data.invoiced_amount) || 0,
          status: data.status || 'pending',
          deadline: safeDeadline,
        })
        .then(({ error }) => {
          if (error) console.error('Supabase projects insert error:', error);
        });
    }
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const now = new Date().toISOString();
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: now } : p))
    );

    if (isSupabaseConfigured && supabase && user) {
      const dbUpdates: Record<string, unknown> = {
        ...updates,
        updated_at: now,
      };
      if ('client_id' in dbUpdates) {
        dbUpdates.client_id = toValidUUIDOrNull(dbUpdates.client_id as string);
      }
      if ('deadline' in dbUpdates) {
        dbUpdates.deadline = toSafeISODate(dbUpdates.deadline as string);
      }
      if ('budget' in dbUpdates && dbUpdates.budget !== undefined) {
        dbUpdates.budget = Number(dbUpdates.budget) || 0;
      }
      if ('quoted_price' in dbUpdates && dbUpdates.quoted_price !== undefined) {
        dbUpdates.quoted_price = Number(dbUpdates.quoted_price) || 0;
      }
      if ('invoiced_amount' in dbUpdates && dbUpdates.invoiced_amount !== undefined) {
        dbUpdates.invoiced_amount = Number(dbUpdates.invoiced_amount) || 0;
      }

      supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.error('Supabase projects update error:', error);
        });
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
        .then(({ error }) => {
          if (error) console.error('Supabase projects delete error:', error);
        });
    }
  };

  // Calendar Operations
  const addCalendar = useCallback(
    (data: { name: string; color: string; description?: string }): Calendar => {
      const newId = generateUUID();
      const now = new Date().toISOString();
      const newCal: Calendar = {
        id: newId,
        user_id: user?.id,
        name: data.name.trim(),
        color: data.color || '#6366f1',
        description: data.description?.trim() || undefined,
        is_default: false,
        shares: [],
        created_at: now,
        updated_at: now,
      };

      setCalendars((prev) => [...prev, newCal]);

      if (isSupabaseConfigured && supabase && user) {
        supabase
          .from('calendars')
          .insert({
            id: newId,
            user_id: user.id,
            name: newCal.name,
            color: newCal.color,
            description: newCal.description || null,
            is_default: false,
          })
          .then(({ error }) => {
            if (error) console.warn('Supabase calendar insert notice:', error.message);
          });
      }

      return newCal;
    },
    [user]
  );

  const updateCalendar = useCallback(
    (id: string, updates: Partial<Calendar>) => {
      const now = new Date().toISOString();
      setCalendars((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: now } : c))
      );

      if (isSupabaseConfigured && supabase && user) {
        supabase
          .from('calendars')
          .update({
            name: updates.name,
            color: updates.color,
            description: updates.description,
            updated_at: now,
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Supabase calendar update notice:', error.message);
          });
      }
    },
    [user]
  );

  const deleteCalendar = useCallback(
    (id: string) => {
      setCalendars((prev) => prev.filter((c) => c.id !== id && !c.is_default));
      if (activeCalendarId === id) {
        setActiveCalendarId('all');
      }

      if (isSupabaseConfigured && supabase && user) {
        supabase
          .from('calendars')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Supabase calendar delete notice:', error.message);
          });
      }
    },
    [activeCalendarId, user]
  );

  const shareCalendar = useCallback(
    (calendarId: string, email: string, permission: 'view' | 'edit') => {
      const newShareId = generateUUID();
      const now = new Date().toISOString();
      const newShare: CalendarShare = {
        id: newShareId,
        calendar_id: calendarId,
        email: email.trim().toLowerCase(),
        permission,
        created_at: now,
      };

      setCalendars((prev) =>
        prev.map((c) => {
          if (c.id === calendarId) {
            const existingShares = c.shares || [];
            return {
              ...c,
              shares: [...existingShares.filter((s) => s.email !== newShare.email), newShare],
            };
          }
          return c;
        })
      );

      if (isSupabaseConfigured && supabase && user) {
        supabase
          .from('calendar_shares')
          .insert({
            id: newShareId,
            calendar_id: calendarId,
            email: newShare.email,
            permission: newShare.permission,
          })
          .then(({ error }) => {
            if (error) console.warn('Supabase calendar_shares notice:', error.message);
          });
      }
    },
    [user]
  );

  const removeCalendarShare = useCallback(
    (calendarId: string, shareId: string) => {
      setCalendars((prev) =>
        prev.map((c) => {
          if (c.id === calendarId) {
            return {
              ...c,
              shares: (c.shares || []).filter((s) => s.id !== shareId),
            };
          }
          return c;
        })
      );

      if (isSupabaseConfigured && supabase && user) {
        supabase
          .from('calendar_shares')
          .delete()
          .eq('id', shareId)
          .then(({ error }) => {
            if (error) console.warn('Supabase calendar_shares delete notice:', error.message);
          });
      }
    },
    [user]
  );

  // Organized Hierarchical Tasks
  const getOrganizedTasks = (
    scope?: TaskScope,
    projectId?: string | null,
    calendarId?: string | null
  ) => {
    let filtered = tasks;

    if (scope) {
      filtered = filtered.filter((t) =>
        scope === 'projects' || scope === 'freelance'
          ? t.scope === 'projects' || t.scope === 'freelance'
          : t.scope === scope
      );
    }
    if (projectId) {
      filtered = filtered.filter((t) => t.project_id === projectId);
    }
    if (calendarId && calendarId !== 'all') {
      filtered = filtered.filter((t) => t.calendar_id === calendarId);
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
    calendars,
    activeCalendarId,
    setActiveCalendarId,
    addCalendar,
    updateCalendar,
    deleteCalendar,
    shareCalendar,
    removeCalendarShare,
    activeModule,
    setActiveModule,
    navigateToHome,
    selectedProjectId,
    setSelectedProjectId,
    searchQuery,
    setSearchQuery,
    guestEmail,
    setGuestEmail,
    isGuestAccessModalOpen,
    setIsGuestAccessModalOpen,
    openGuestAccess,
    validateGuestEmailAccess,
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
    isDataLoading,
    refreshData: fetchSupabaseData,
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
