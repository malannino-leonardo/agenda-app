import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Client,
  Project,
  Task,
  NavigationModule,
  TaskScope,
  Calendar,
  CalendarInvite,
  CalendarPermission,
  CalendarRole,
  InviteInfo,
  PendingInvite,
  PersonProfile,
} from '../types';
import { loadStoredData, saveStoredData, clearStoredData } from '../lib/storage';
import { useAuth, getCachedAuthUser } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  checkRateLimit,
  recordRateLimitAttempt,
  RATE_LIMIT_CONFIGS,
} from '../lib/rateLimit';
import { buildTaskTree } from '../lib/calendarUtils';
import { useTaskReminders } from '../hooks/useTaskReminders';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface AppContextType {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  activeModule: NavigationModule;
  setActiveModule: (module: NavigationModule) => void;
  navigateToHome: () => void;
  navigateToInvite: (token: string) => void;
  inviteToken: string | null;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;

  // Calendars (own + shared with me)
  calendars: Calendar[];
  ownedCalendars: Calendar[];
  sharedCalendars: Calendar[];
  writableCalendars: Calendar[];
  defaultCalendar: Calendar | null;
  hiddenCalendarIds: string[];
  visibleCalendarIds: string[];
  isCalendarVisible: (id: string) => boolean;
  toggleCalendarVisibility: (id: string) => void;
  showAllCalendars: () => void;
  showOnlyCalendar: (id: string) => void;
  addCalendar: (data: { name: string; color: string; description?: string }) => Calendar;
  updateCalendar: (id: string, updates: Partial<Calendar>) => void;
  deleteCalendar: (id: string) => void;
  leaveCalendar: (id: string) => void;
  getCalendarRole: (calendarId?: string | null) => CalendarRole | null;
  profiles: Record<string, PersonProfile>;

  // Sharing
  sharingAvailable: boolean;
  pendingInvites: PendingInvite[];
  inviteByEmail: (calendarId: string, email: string, permission: CalendarPermission) => Promise<CalendarInvite>;
  createInviteLink: (calendarId: string, permission: CalendarPermission) => Promise<CalendarInvite>;
  revokeInvite: (calendarId: string, inviteId: string) => Promise<void>;
  updateMemberPermission: (calendarId: string, memberId: string, permission: CalendarPermission) => Promise<void>;
  removeMember: (calendarId: string, memberId: string) => Promise<void>;
  getInviteInfo: (token: string) => Promise<InviteInfo>;
  acceptInvite: (token: string) => Promise<string>;
  declineInvite: (token: string) => Promise<void>;
  buildInviteUrl: (token: string) => string;

  // Reminders (browser notifications)
  remindersEnabled: boolean;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;

  // Task Operations
  canEditTask: (task: Task) => boolean;
  toggleTaskCompletion: (taskId: string) => void;
  addTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => string | null;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  bulkUpdateTasks: (ids: string[], updates: Pick<Partial<Task>, 'status' | 'priority'>) => void;
  bulkDeleteTasks: (ids: string[]) => void;
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

const INVITE_STORAGE_KEY = 'agenda_pending_invite_token';
const SYNC_INTERVAL_MS = 25000;
const MUTATION_GRACE_MS = 6000;

export const rememberPendingInvite = (token: string | null) => {
  try {
    if (token) localStorage.setItem(INVITE_STORAGE_KEY, token);
    else localStorage.removeItem(INVITE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

const getRememberedInvite = (): string | null => {
  try {
    return localStorage.getItem(INVITE_STORAGE_KEY);
  } catch {
    return null;
  }
};

const parsePath = (
  path: string,
  isLoggedIn = false
): { module: NavigationModule; inviteToken: string | null } => {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const lower = clean.toLowerCase();
  if (lower === 'invite' || lower.startsWith('invite/')) {
    const token = clean.split('/')[1] || null;
    return { module: 'invite', inviteToken: token ? decodeURIComponent(token) : null };
  }
  const mod = ((): NavigationModule => {
    if (lower === 'home') return 'home';
    if (!lower) return isLoggedIn ? 'agenda' : 'home';
    if (lower === 'agenda' || lower === 'dashboard') return 'agenda';
    if (lower === 'tasks') return 'tasks';
    if (lower === 'projects' || lower === 'freelance') return 'projects';
    if (lower === 'clients') return 'clients';
    if (lower === 'account') return 'account';
    if (lower === 'privacy') return 'privacy';
    if (lower === 'terms') return 'terms';
    return '404';
  })();
  return { module: mod, inviteToken: null };
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const toValidUUIDOrNull = (val?: string | null): string | null => {
  if (!val || !val.trim()) return null;
  const trimmed = val.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
};

const TASK_DB_FIELDS = [
  'parent_id',
  'scope',
  'project_id',
  'calendar_id',
  'title',
  'description',
  'status',
  'priority',
  'due_date',
  'due_time',
  'duration_minutes',
  'remind_before',
  'order_index',
  'completed_at',
  'updated_at',
] as const;

/** Whitelist + normalise a task patch for the database (drops client-only fields such as `subtasks`). */
const toDbTaskFields = (updates: Partial<Task>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of TASK_DB_FIELDS) {
    if (!(key in updates)) continue;
    out[key] = (updates as Record<string, unknown>)[key];
  }
  if (out.scope === 'projects') out.scope = 'freelance';
  if ('parent_id' in out) out.parent_id = toValidUUIDOrNull(out.parent_id as string);
  if ('project_id' in out) out.project_id = toValidUUIDOrNull(out.project_id as string);
  if ('calendar_id' in out) out.calendar_id = toValidUUIDOrNull(out.calendar_id as string);
  if ('due_date' in out) out.due_date = toSafeISODate(out.due_date as string);
  if ('description' in out && out.description === undefined) out.description = null;
  for (const k of ['due_time', 'duration_minutes', 'remind_before'] as const) {
    if (k in out && (out[k] === undefined || out[k] === '')) out[k] = null;
  }
  return out;
};

const errorCode = (err: unknown): string => {
  const msg = (err as { message?: string })?.message || '';
  const known = [
    'not_authenticated',
    'forbidden',
    'invalid_permission',
    'invalid_email',
    'already_member',
    'invite_invalid',
    'invite_expired',
    'invite_exhausted',
    'invite_email_mismatch',
  ];
  return known.find((k) => msg.includes(k)) || msg || 'unknown_error';
};

const AppContext = createContext<AppContextType | undefined>(undefined);

type RawCalendar = Calendar;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, profile, openSignIn } = useAuth();
  const initialData = useMemo(() => loadStoredData(), []);

  const [clients, setClients] = useState<Client[]>(initialData.clients);
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [tasks, setTasks] = useState<Task[]>(initialData.tasks);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [rawCalendars, setRawCalendars] = useState<RawCalendar[]>(() =>
    initialData.calendars && initialData.calendars.length > 0 ? initialData.calendars : []
  );
  const [profileMap, setProfileMap] = useState<Record<string, PersonProfile>>({});
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // ---- toasts -------------------------------------------------------------
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = ++toastSeq.current;
      setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
      window.setTimeout(() => dismissToast(id), kind === 'error' ? 5000 : 3000);
    },
    [dismissToast]
  );

  // ---- navigation ---------------------------------------------------------
  const [activeModule, setActiveModuleState] = useState<NavigationModule>(() => {
    const cachedAuth = getCachedAuthUser();
    const isLogged = Boolean(cachedAuth.user);
    const { module } = parsePath(window.location.pathname, isLogged);
    if (isLogged && module === 'agenda' && (window.location.pathname === '/' || window.location.pathname === '')) {
      window.history.replaceState(null, '', '/agenda');
    }
    return module;
  });
  const [inviteToken, setInviteToken] = useState<string | null>(
    () => parsePath(window.location.pathname).inviteToken
  );
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

  const navigateToInvite = useCallback((token: string) => {
    setInviteToken(token);
    setActiveModuleState('invite');
    const target = `/invite/${encodeURIComponent(token)}`;
    if (window.location.pathname !== target) {
      window.history.pushState(null, '', target);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parsePath(window.location.pathname, Boolean(user));
      setInviteToken(parsed.inviteToken);
      setActiveModuleState(parsed.module);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // After sign-in, resume an invite the visitor opened while signed out
  const resumedInviteForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      resumedInviteForRef.current = null;
      return;
    }
    // Only once per sign-in: later navigation must never be hijacked by a forgotten invite
    if (resumedInviteForRef.current === user.id) return;
    resumedInviteForRef.current = user.id;
    const remembered = getRememberedInvite();
    if (remembered) navigateToInvite(remembered);
  }, [user, navigateToInvite]);

  // ---- calendar visibility (stored as a *hidden* list so new calendars show up by default)
  const hiddenKey = `agenda_hidden_calendars_${user?.id || 'local'}`;
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(hiddenKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setHiddenCalendarIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHiddenCalendarIds([]);
    }
  }, [hiddenKey]);

  const persistHidden = useCallback(
    (ids: string[]) => {
      setHiddenCalendarIds(ids);
      try {
        localStorage.setItem(hiddenKey, JSON.stringify(ids));
      } catch {
        // ignore
      }
    },
    [hiddenKey]
  );

  // ---- derived calendar data ----------------------------------------------
  const selfProfile = useMemo<PersonProfile | null>(
    () =>
      user
        ? {
            id: user.id,
            full_name: profile?.full_name || user.email?.split('@')[0] || '',
            email: user.email || profile?.email || '',
            avatar_url: profile?.avatar_url || null,
          }
        : null,
    [user, profile]
  );

  const profiles = useMemo<Record<string, PersonProfile>>(() => {
    const map = { ...profileMap };
    if (selfProfile) map[selfProfile.id] = selfProfile;
    return map;
  }, [profileMap, selfProfile]);

  const calendars = useMemo<Calendar[]>(() => {
    const uid = user?.id;
    return rawCalendars.map((c) => {
      const isOwner = !c.user_id || c.user_id === uid;
      const myMembership = (c.members || []).find((m) => m.user_id === uid);
      const role: CalendarRole = isOwner ? 'owner' : myMembership?.permission || 'view';
      return {
        ...c,
        role,
        owner_profile: c.user_id ? profiles[c.user_id] || null : null,
        members: (c.members || []).map((m) => ({ ...m, profile: profiles[m.user_id] || null })),
      };
    });
  }, [rawCalendars, profiles, user?.id]);

  const ownedCalendars = useMemo(() => calendars.filter((c) => c.role === 'owner'), [calendars]);
  const sharedCalendars = useMemo(() => calendars.filter((c) => c.role !== 'owner'), [calendars]);
  const writableCalendars = useMemo(
    () => calendars.filter((c) => c.role === 'owner' || c.role === 'edit'),
    [calendars]
  );
  const defaultCalendar = useMemo(
    () => ownedCalendars.find((c) => c.is_default) || ownedCalendars[0] || null,
    [ownedCalendars]
  );

  const visibleCalendarIds = useMemo(
    () => calendars.map((c) => c.id).filter((id) => !hiddenCalendarIds.includes(id)),
    [calendars, hiddenCalendarIds]
  );
  const isCalendarVisible = useCallback(
    (id: string) => !hiddenCalendarIds.includes(id),
    [hiddenCalendarIds]
  );
  const toggleCalendarVisibility = useCallback(
    (id: string) => {
      persistHidden(
        hiddenCalendarIds.includes(id)
          ? hiddenCalendarIds.filter((h) => h !== id)
          : [...hiddenCalendarIds, id]
      );
    },
    [hiddenCalendarIds, persistHidden]
  );
  const showAllCalendars = useCallback(() => persistHidden([]), [persistHidden]);
  const showOnlyCalendar = useCallback(
    (id: string) => persistHidden(calendars.map((c) => c.id).filter((cid) => cid !== id)),
    [calendars, persistHidden]
  );

  const getCalendarRole = useCallback(
    (calendarId?: string | null): CalendarRole | null => {
      if (!calendarId) return 'owner';
      const cal = calendars.find((c) => c.id === calendarId);
      return cal ? cal.role || 'view' : null;
    },
    [calendars]
  );

  const sharingAvailable = Boolean(isSupabaseConfigured && supabase && user && session);

  // ---- in-flight write tracking (keeps polling from reverting optimistic edits) ----
  const inflightRef = useRef(new Map<string, { count: number; settledAt: number | null; deleted: boolean }>());
  const queueRef = useRef(new Map<string, Promise<unknown>>());
  const fetchSeqRef = useRef(0);
  const creatingDefaultCalendarRef = useRef(false);

  const isProtected = (id: string): boolean => {
    const m = inflightRef.current.get(id);
    if (!m) return false;
    if (m.count > 0) return true;
    if (m.settledAt !== null && Date.now() - m.settledAt < MUTATION_GRACE_MS) return true;
    inflightRef.current.delete(id);
    return false;
  };

  const beginWrite = (ids: string[], deleted = false) => {
    ids.forEach((id) => {
      const m = inflightRef.current.get(id);
      inflightRef.current.set(id, {
        count: (m?.count ?? 0) + 1,
        settledAt: null,
        deleted: deleted || Boolean(m?.deleted),
      });
    });
  };

  const endWrite = (ids: string[], ok: boolean) => {
    ids.forEach((id) => {
      const m = inflightRef.current.get(id);
      if (!m) return;
      const count = Math.max(0, m.count - 1);
      if (count === 0 && !ok) inflightRef.current.delete(id);
      else inflightRef.current.set(id, { ...m, count, settledAt: count === 0 ? Date.now() : null });
    });
  };

  /** Serialise writes per task so they reach the server in click order. */
  const enqueue = <T,>(ids: string[], op: () => Promise<T>): Promise<T> => {
    const previous = Promise.all(ids.map((id) => queueRef.current.get(id) ?? Promise.resolve()));
    const run = previous.then(op);
    const settled = run.then(
      () => undefined,
      () => undefined
    );
    ids.forEach((id) => {
      queueRef.current.set(id, settled);
      void settled.then(() => {
        if (queueRef.current.get(id) === settled) queueRef.current.delete(id);
      });
    });
    return run;
  };

  const mergeTasks = (incoming: Task[], local: Task[]): Task[] => {
    const localById = new Map(local.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const result: Task[] = [];
    for (const inc of incoming) {
      seen.add(inc.id);
      const protectedEntry = isProtected(inc.id);
      if (protectedEntry && inflightRef.current.get(inc.id)?.deleted) continue;
      result.push(protectedEntry && localById.has(inc.id) ? (localById.get(inc.id) as Task) : inc);
    }
    // Keep freshly created tasks whose insert has not been visible on the server yet
    for (const t of local) {
      if (!seen.has(t.id) && isProtected(t.id) && !inflightRef.current.get(t.id)?.deleted) {
        result.push(t);
      }
    }
    return result;
  };

  // ---- fetch ----------------------------------------------------------------
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    const client = supabase;
    const seq = ++fetchSeqRef.current;

    try {
      const { data: sessionData } = await client.auth.getSession();
      let activeSession = sessionData?.session || session;
      if (!activeSession) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const retry = await client.auth.getSession();
        activeSession = retry.data?.session || session;
      }
      if (!activeSession) return;

      const [clientsRes, projectsRes, tasksRes, calsRes, invitesRes] = await Promise.all([
        client.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        client.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        client.from('tasks').select('*').order('order_index', { ascending: true }),
        client.from('calendars').select('*, members:calendar_members(*), invites:calendar_invites(*)').order('created_at', { ascending: true }),
        client.rpc('my_pending_invites'),
      ]);

      // A newer sync started while this one was in flight: this result is stale
      if (seq !== fetchSeqRef.current) return;

      if (clientsRes.error) console.warn('Notice loading clients:', clientsRes.error.message);
      else if (clientsRes.data) setClients(clientsRes.data as Client[]);

      if (projectsRes.error) console.warn('Notice loading projects:', projectsRes.error.message);
      else if (projectsRes.data) setProjects(projectsRes.data as Project[]);

      if (tasksRes.error) console.warn('Notice loading tasks:', tasksRes.error.message);
      else if (tasksRes.data) {
        const incoming = tasksRes.data as Task[];
        setTasks((prev) => mergeTasks(incoming, prev));
      }

      let loadedCalendars: RawCalendar[] | null = null;
      if (calsRes.error) {
        console.warn('Notice loading calendars:', calsRes.error.message);
      } else if (calsRes.data) {
        loadedCalendars = calsRes.data as RawCalendar[];
        const hasOwned = loadedCalendars.some((c) => c.user_id === user.id);
        let skipCalendars = false;
        if (!hasOwned) {
          if (creatingDefaultCalendarRef.current) {
            // Another sync is already creating the main calendar: keep what we have
            skipCalendars = true;
          } else {
            // First run: create the real "Personal" calendar so it can be shared later on
            creatingDefaultCalendarRef.current = true;
            try {
              const now = new Date().toISOString();
              const personal: RawCalendar = {
                id: generateUUID(),
                user_id: user.id,
                name: 'Personal',
                color: '#6366f1',
                description: 'Main personal calendar',
                is_default: true,
                members: [],
                invites: [],
                created_at: now,
                updated_at: now,
              };
              const { error } = await client.from('calendars').insert({
                id: personal.id,
                user_id: user.id,
                name: personal.name,
                color: personal.color,
                description: personal.description,
                is_default: true,
              });
              if (!error) loadedCalendars = [personal, ...loadedCalendars];
              else console.warn('Notice creating default calendar:', error.message);
            } finally {
              creatingDefaultCalendarRef.current = false;
            }
          }
        }
        if (skipCalendars) loadedCalendars = null;
        if (loadedCalendars) setRawCalendars(loadedCalendars);
      }

      if (!invitesRes.error && Array.isArray(invitesRes.data)) {
        setPendingInvites(invitesRes.data as PendingInvite[]);
      }

      // Names / emails of collaborators and task authors
      const needed = new Set<string>();
      (loadedCalendars || []).forEach((c) => {
        if (c.user_id && c.user_id !== user.id) needed.add(c.user_id);
        (c.members || []).forEach((m) => m.user_id !== user.id && needed.add(m.user_id));
      });
      (tasksRes.data as Task[] | null)?.forEach((t) => {
        if (t.user_id && t.user_id !== user.id) needed.add(t.user_id);
      });
      if (needed.size > 0) {
        const { data: profileRows } = await client
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', Array.from(needed));
        if (profileRows && seq === fetchSeqRef.current) {
          setProfileMap(Object.fromEntries((profileRows as PersonProfile[]).map((p) => [p.id, p])));
        }
      }
    } catch (err) {
      console.warn('Notice fetching Supabase data:', err);
    }
  }, [user, session]);

  const refreshData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      await fetchSupabaseData();
    } finally {
      setIsDataLoading(false);
    }
  }, [fetchSupabaseData]);

  useEffect(() => {
    if (user && isSupabaseConfigured && supabase) {
      void refreshData();
    } else if (!user) {
      setClients([]);
      setProjects([]);
      setTasks([]);
      setPendingInvites([]);
      setProfileMap({});
      if (isSupabaseConfigured) {
        // Cloud mode: never leave another account's (shared) data cached on this device
        setRawCalendars([]);
        clearStoredData();
      }
    }
  }, [user, session, refreshData]);

  // Live-ish sync with collaborators: on focus, when the tab becomes visible, and every 25s
  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    const sync = () => {
      if (document.visibilityState === 'visible') void fetchSupabaseData();
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    const interval = window.setInterval(sync, SYNC_INTERVAL_MS);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
      window.clearInterval(interval);
    };
  }, [user, fetchSupabaseData]);

  // Offline cache
  useEffect(() => {
    if (user) {
      saveStoredData(clients, projects, tasks, rawCalendars);
    }
  }, [user, clients, projects, tasks, rawCalendars]);

  // ---- permissions ---------------------------------------------------------
  const canEditTask = useCallback(
    (task: Task): boolean => {
      if (!user) return false;
      if (!task.calendar_id) return !task.user_id || task.user_id === user.id;
      const role = getCalendarRole(task.calendar_id);
      if (role === null) return !task.user_id || task.user_id === user.id;
      return role === 'owner' || role === 'edit';
    },
    [user, getCalendarRole]
  );

  const requireUser = (): boolean => {
    if (user) return true;
    showToast('Sign in to modify tasks.', 'info');
    openSignIn();
    return false;
  };

  // ---- task writes -----------------------------------------------------------
  /** Optimistic local patch + serialised remote write with rollback-by-refetch on failure. */
  const persistTaskUpdate = (ids: string[], patch: Partial<Task>) => {
    if (!(isSupabaseConfigured && supabase && user)) return;
    const client = supabase;
    const dbFields = toDbTaskFields(patch);
    beginWrite(ids);
    let ok = false;
    void enqueue(ids, async () => {
      let query = client.from('tasks').update(dbFields);
      query = ids.length === 1 ? query.eq('id', ids[0]) : query.in('id', ids);
      let { error } = await query;
      if (error && /column/i.test(error.message)) {
        const fallback = { ...dbFields };
        delete fallback.duration_minutes;
        delete fallback.remind_before;
        let retry = client.from('tasks').update(fallback);
        retry = ids.length === 1 ? retry.eq('id', ids[0]) : retry.in('id', ids);
        ({ error } = await retry);
      }
      return error;
    })
      .then((error) => {
        ok = !error;
        if (error) {
          console.error('Supabase tasks update error:', error);
          showToast("Couldn't save your change. Restoring the latest version.", 'error');
        }
      })
      .catch((err) => {
        console.error('Supabase tasks update error:', err);
        showToast("Couldn't save your change. Restoring the latest version.", 'error');
      })
      .finally(() => {
        endWrite(ids, ok);
        if (!ok) void fetchSupabaseData();
      });
  };

  const applyLocalPatch = (ids: string[], patch: Partial<Task>) => {
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        idSet.has(t.id)
          ? {
              ...t,
              ...patch,
              updated_at: now,
              completed_at:
                patch.status === undefined
                  ? t.completed_at
                  : patch.status === 'completed'
                  ? now
                  : null,
            }
          : t
      )
    );
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    if (!requireUser()) return;
    const target = tasks.find((t) => t.id === taskId);
    if (target && !canEditTask(target)) {
      showToast('You have view-only access to this calendar.', 'info');
      return;
    }
    // Moving into another calendar requires edit rights there too
    if (updates.calendar_id && updates.calendar_id !== target?.calendar_id) {
      const dest = getCalendarRole(updates.calendar_id);
      if (dest !== 'owner' && dest !== 'edit') {
        showToast('You cannot add tasks to that calendar.', 'error');
        return;
      }
    }

    const now = new Date().toISOString();
    const patch: Partial<Task> = { ...updates };
    delete patch.subtasks;
    if (patch.status !== undefined) patch.completed_at = patch.status === 'completed' ? now : null;
    applyLocalPatch([taskId], patch);
    persistTaskUpdate([taskId], { ...patch, updated_at: now });

    // Keep subtasks in the same calendar as their parent
    if ('calendar_id' in patch) {
      const childIds = tasks.filter((t) => t.parent_id === taskId).map((t) => t.id);
      if (childIds.length) {
        applyLocalPatch(childIds, { calendar_id: patch.calendar_id });
        persistTaskUpdate(childIds, { calendar_id: patch.calendar_id });
      }
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    if (!requireUser()) return;
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    if (!canEditTask(target)) {
      showToast('You have view-only access to this calendar.', 'info');
      return;
    }
    // Use the optimistic (possibly still-unconfirmed) status when clicks come faster than the server
    const nextStatus = target.status === 'completed' ? 'pending' : 'completed';
    const now = new Date().toISOString();
    const childIds =
      nextStatus === 'completed'
        ? tasks.filter((t) => t.parent_id === taskId && t.status !== 'completed').map((t) => t.id)
        : [];

    applyLocalPatch([taskId, ...childIds], { status: nextStatus });
    persistTaskUpdate([taskId], { status: nextStatus, completed_at: nextStatus === 'completed' ? now : null, updated_at: now });
    if (childIds.length) {
      persistTaskUpdate(childIds, { status: 'completed', completed_at: now, updated_at: now });
    }
  };

  const bulkUpdateTasks = (ids: string[], updates: Pick<Partial<Task>, 'status' | 'priority'>) => {
    if (!requireUser()) return;
    const editable = Array.from(new Set(ids)).filter((id) => {
      const t = tasks.find((x) => x.id === id);
      return t && canEditTask(t);
    });
    if (editable.length === 0) {
      showToast('You have view-only access to the selected tasks.', 'info');
      return;
    }
    const now = new Date().toISOString();
    const patch: Partial<Task> = { ...updates };
    if (updates.status !== undefined) patch.completed_at = updates.status === 'completed' ? now : null;
    applyLocalPatch(editable, patch);
    persistTaskUpdate(editable, { ...patch, updated_at: now });
  };

  const bulkDeleteTasks = (ids: string[]) => {
    if (!requireUser()) return;
    const deletable = Array.from(new Set(ids)).filter((id) => {
      const t = tasks.find((x) => x.id === id);
      return t && canEditTask(t);
    });
    if (deletable.length === 0) {
      showToast('You have view-only access to the selected tasks.', 'info');
      return;
    }
    const childIds = tasks.filter((t) => t.parent_id && deletable.includes(t.parent_id)).map((t) => t.id);
    const allIds = Array.from(new Set([...deletable, ...childIds]));
    const idSet = new Set(allIds);
    beginWrite(allIds, true);
    setTasks((prev) => prev.filter((t) => !idSet.has(t.id)));

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      let ok = false;
      void enqueue(deletable, async () => {
        const { error } = await client.from('tasks').delete().in('id', deletable);
        return error;
      })
        .then((error) => {
          ok = !error;
          if (error) {
            console.error('Supabase tasks delete error:', error);
            showToast("Couldn't delete the task(s).", 'error');
          }
        })
        .catch((err) => console.error('Supabase tasks delete error:', err))
        .finally(() => {
          endWrite(allIds, ok);
          if (!ok) void fetchSupabaseData();
        });
    } else {
      endWrite(allIds, true);
    }
  };

  const deleteTask = (taskId: string) => bulkDeleteTasks([taskId]);

  const addTask = (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): string | null => {
    if (!requireUser() || !user) return null;
    const rateLimitCheck = checkRateLimit('action_task_create', RATE_LIMIT_CONFIGS.TASK_CREATE);
    if (!rateLimitCheck.allowed) {
      showToast(`Too many tasks created. Please wait ${rateLimitCheck.retryAfterSeconds}s.`, 'error');
      return null;
    }
    recordRateLimitAttempt('action_task_create', RATE_LIMIT_CONFIGS.TASK_CREATE);

    // Subtasks live in their parent's calendar
    const parent = data.parent_id ? tasks.find((t) => t.id === data.parent_id) : undefined;
    let calendarId: string | null = parent ? parent.calendar_id || null : data.calendar_id || null;
    if (isSupabaseConfigured && calendarId && !toValidUUIDOrNull(calendarId)) calendarId = null;

    if (calendarId) {
      const role = getCalendarRole(calendarId);
      if (role !== 'owner' && role !== 'edit') {
        showToast('You have view-only access to that calendar.', 'info');
        return null;
      }
    }

    const newId = generateUUID();
    const now = new Date().toISOString();
    const safeDueDate = toSafeISODate(data.due_date);
    const newTask: Task = {
      ...data,
      id: newId,
      due_date: safeDueDate || undefined,
      due_time: data.due_time || undefined,
      calendar_id: calendarId || undefined,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      completed_at: data.status === 'completed' ? now : null,
    };
    delete newTask.subtasks;

    beginWrite([newId]);
    setTasks((prev) => [newTask, ...prev]);

    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const payload: Record<string, unknown> = {
        id: newId,
        user_id: user.id,
        ...toDbTaskFields({
          parent_id: data.parent_id,
          scope: data.scope || 'agenda',
          project_id: data.project_id,
          calendar_id: calendarId,
          title: data.title,
          description: data.description || undefined,
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          due_date: data.due_date,
          due_time: data.due_time,
          duration_minutes: data.duration_minutes,
          remind_before: data.remind_before,
          order_index: data.order_index || 0,
        }),
      };
      let ok = false;
      void enqueue([newId], async () => {
        let { error } = await client.from('tasks').insert(payload);
        if (error && /column/i.test(error.message)) {
          const fallback = { ...payload };
          delete fallback.duration_minutes;
          delete fallback.remind_before;
          ({ error } = await client.from('tasks').insert(fallback));
        }
        return error;
      })
        .then((error) => {
          ok = !error;
          if (error) {
            console.error('Supabase tasks insert error:', error);
            showToast("Couldn't save the new task.", 'error');
            setTasks((prev) => prev.filter((t) => t.id !== newId));
          }
        })
        .catch((err) => console.error('Supabase tasks insert error:', err))
        .finally(() => endWrite([newId], ok));
    } else {
      endWrite([newId], true);
    }

    return newId;
  };

  // ---- clients / projects (unchanged behaviour) -------------------------------
  const addClient = (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
    const rateLimitCheck = checkRateLimit('action_client_create', RATE_LIMIT_CONFIGS.CLIENT_CREATE);
    if (!rateLimitCheck.allowed) {
      console.warn(`Client creation rate limit exceeded. Please wait ${rateLimitCheck.retryAfterSeconds}s.`);
      return;
    }
    recordRateLimitAttempt('action_client_create', RATE_LIMIT_CONFIGS.CLIENT_CREATE);

    const newId = generateUUID();
    const now = new Date().toISOString();
    const newClient: Client = { ...data, id: newId, user_id: user?.id, created_at: now, updated_at: now };
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
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: now } : c)));

    if (isSupabaseConfigured && supabase && user) {
      const dbUpdates: Record<string, unknown> = { ...updates, updated_at: now };
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
    setProjects((prev) => prev.map((p) => (p.client_id === id ? { ...p, client_id: undefined } : p)));

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
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, updated_at: now } : p)));

    if (isSupabaseConfigured && supabase && user) {
      const dbUpdates: Record<string, unknown> = { ...updates, updated_at: now };
      if ('client_id' in dbUpdates) dbUpdates.client_id = toValidUUIDOrNull(dbUpdates.client_id as string);
      if ('deadline' in dbUpdates) dbUpdates.deadline = toSafeISODate(dbUpdates.deadline as string);
      for (const k of ['budget', 'quoted_price', 'invoiced_amount'] as const) {
        if (k in dbUpdates && dbUpdates[k] !== undefined) dbUpdates[k] = Number(dbUpdates[k]) || 0;
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

  // ---- calendars -------------------------------------------------------------
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
        members: [],
        invites: [],
        created_at: now,
        updated_at: now,
      };
      setRawCalendars((prev) => [...prev, newCal]);

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
            if (error) {
              console.warn('Supabase calendar insert notice:', error.message);
              showToast("Couldn't save the calendar.", 'error');
            }
          });
      }
      return { ...newCal, role: 'owner' };
    },
    [user, showToast]
  );

  const updateCalendar = useCallback(
    (id: string, updates: Partial<Calendar>) => {
      const cal = calendars.find((c) => c.id === id);
      if (cal && cal.role !== 'owner') {
        showToast('Only the owner can edit this calendar.', 'info');
        return;
      }
      const now = new Date().toISOString();
      setRawCalendars((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...(updates.name !== undefined ? { name: updates.name } : {}),
                ...(updates.color !== undefined ? { color: updates.color } : {}),
                ...(updates.description !== undefined ? { description: updates.description } : {}),
                updated_at: now,
              }
            : c
        )
      );
      if (isSupabaseConfigured && supabase && user) {
        const patch: Record<string, unknown> = { updated_at: now };
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.color !== undefined) patch.color = updates.color;
        if (updates.description !== undefined) patch.description = updates.description || null;
        supabase
          .from('calendars')
          .update(patch)
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) {
              console.warn('Supabase calendar update notice:', error.message);
              showToast("Couldn't update the calendar.", 'error');
            }
          });
      }
    },
    [user, calendars, showToast]
  );

  const deleteCalendar = useCallback(
    (id: string) => {
      const cal = calendars.find((c) => c.id === id);
      if (!cal || cal.role !== 'owner') {
        showToast('Only the owner can delete this calendar.', 'info');
        return;
      }
      if (cal.is_default) {
        showToast('Your main calendar cannot be deleted.', 'info');
        return;
      }
      setRawCalendars((prev) => prev.filter((c) => c.id !== id));
      // My own tasks survive (unassigned); other people's tasks in it are no longer visible to me
      setTasks((prev) =>
        prev
          .filter((t) => t.calendar_id !== id || !t.user_id || t.user_id === user?.id)
          .map((t) => (t.calendar_id === id ? { ...t, calendar_id: undefined } : t))
      );
      if (isSupabaseConfigured && supabase && user) {
        supabase
          .from('calendars')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) {
              console.warn('Supabase calendar delete notice:', error.message);
              showToast("Couldn't delete the calendar.", 'error');
            }
            void fetchSupabaseData();
          });
      }
    },
    [user, calendars, showToast, fetchSupabaseData]
  );

  const leaveCalendar = useCallback(
    (id: string) => {
      if (!user) return;
      setRawCalendars((prev) => prev.filter((c) => c.id !== id));
      setTasks((prev) => prev.filter((t) => t.calendar_id !== id));
      if (isSupabaseConfigured && supabase) {
        supabase
          .from('calendar_members')
          .delete()
          .eq('calendar_id', id)
          .eq('user_id', user.id)
          .then(({ error }) => {
            if (error) {
              showToast("Couldn't leave the calendar.", 'error');
              void fetchSupabaseData();
            }
          });
      }
    },
    [user, showToast, fetchSupabaseData]
  );

  // ---- sharing ----------------------------------------------------------------
  const requireSharing = () => {
    if (!sharingAvailable || !supabase) throw new Error('sharing_unavailable');
    return supabase;
  };

  const upsertInviteInState = (calendarId: string, invite: CalendarInvite) => {
    setRawCalendars((prev) =>
      prev.map((c) => {
        if (c.id !== calendarId) return c;
        const others = (c.invites || []).filter((i) => i.id !== invite.id);
        return { ...c, invites: [...others, invite] };
      })
    );
  };

  const createInvite = async (
    calendarId: string,
    permission: CalendarPermission,
    email: string | null
  ): Promise<CalendarInvite> => {
    const client = requireSharing();
    const { data, error } = await client.rpc('create_calendar_invite', {
      p_calendar: calendarId,
      p_permission: permission,
      p_email: email,
    });
    if (error) throw new Error(errorCode(error));
    const invite = data as CalendarInvite;
    upsertInviteInState(calendarId, invite);
    return invite;
  };

  const inviteByEmail = (calendarId: string, email: string, permission: CalendarPermission) =>
    createInvite(calendarId, permission, email.trim().toLowerCase());

  const createInviteLink = (calendarId: string, permission: CalendarPermission) =>
    createInvite(calendarId, permission, null);

  const revokeInvite = async (calendarId: string, inviteId: string) => {
    const client = requireSharing();
    const { error } = await client.from('calendar_invites').delete().eq('id', inviteId);
    if (error) throw new Error(errorCode(error));
    setRawCalendars((prev) =>
      prev.map((c) =>
        c.id === calendarId ? { ...c, invites: (c.invites || []).filter((i) => i.id !== inviteId) } : c
      )
    );
  };

  const updateMemberPermission = async (
    calendarId: string,
    memberId: string,
    permission: CalendarPermission
  ) => {
    const client = requireSharing();
    const { error } = await client.from('calendar_members').update({ permission }).eq('id', memberId);
    if (error) throw new Error(errorCode(error));
    setRawCalendars((prev) =>
      prev.map((c) =>
        c.id === calendarId
          ? { ...c, members: (c.members || []).map((m) => (m.id === memberId ? { ...m, permission } : m)) }
          : c
      )
    );
  };

  const removeMember = async (calendarId: string, memberId: string) => {
    const client = requireSharing();
    const { error } = await client.from('calendar_members').delete().eq('id', memberId);
    if (error) throw new Error(errorCode(error));
    setRawCalendars((prev) =>
      prev.map((c) =>
        c.id === calendarId ? { ...c, members: (c.members || []).filter((m) => m.id !== memberId) } : c
      )
    );
  };

  const getInviteInfo = async (token: string): Promise<InviteInfo> => {
    if (!isSupabaseConfigured || !supabase) return { valid: false, reason: 'sharing_unavailable' };
    const { data, error } = await supabase.rpc('get_invite_info', { p_token: token });
    if (error) return { valid: false, reason: errorCode(error) };
    return data as InviteInfo;
  };

  const acceptInvite = async (token: string): Promise<string> => {
    const client = requireSharing();
    const { data, error } = await client.rpc('accept_calendar_invite', { p_token: token });
    if (error) throw new Error(errorCode(error));
    rememberPendingInvite(null);
    await fetchSupabaseData();
    return data as string;
  };

  const declineInvite = async (token: string) => {
    const client = requireSharing();
    const { error } = await client.rpc('decline_calendar_invite', { p_token: token });
    if (error) throw new Error(errorCode(error));
    rememberPendingInvite(null);
    setPendingInvites((prev) => prev.filter((i) => i.token !== token));
  };

  const buildInviteUrl = (token: string) => `${window.location.origin}/invite/${token}`;

  // ---- reminders --------------------------------------------------------------
  const { enabled: remindersEnabled, setEnabled: setRemindersEnabled } = useTaskReminders({
    tasks,
    active: Boolean(user),
    onReminder: (message) => showToast(message, 'info'),
  });

  // ---- queries ---------------------------------------------------------------
  const getOrganizedTasks = (scope?: TaskScope, projectId?: string | null, calendarId?: string | null) => {
    let filtered = tasks;

    if (scope) {
      filtered = filtered.filter((t) =>
        scope === 'projects' || scope === 'freelance'
          ? t.scope === 'projects' || t.scope === 'freelance'
          : t.scope === scope
      );
    }
    if (projectId) filtered = filtered.filter((t) => t.project_id === projectId);
    if (calendarId && calendarId !== 'all') filtered = filtered.filter((t) => t.calendar_id === calendarId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const tree = buildTaskTree(
      tasks,
      filtered.filter((t) => !t.parent_id)
    );
    return {
      pendingTasks: tree.filter((t) => t.status !== 'completed'),
      completedTasks: tree.filter((t) => t.status === 'completed'),
    };
  };

  const value: AppContextType = {
    clients,
    projects,
    tasks,
    activeModule,
    setActiveModule,
    navigateToHome,
    navigateToInvite,
    inviteToken,
    selectedProjectId,
    setSelectedProjectId,
    searchQuery,
    setSearchQuery,
    toasts,
    showToast,
    dismissToast,
    calendars,
    ownedCalendars,
    sharedCalendars,
    writableCalendars,
    defaultCalendar,
    hiddenCalendarIds,
    visibleCalendarIds,
    isCalendarVisible,
    toggleCalendarVisibility,
    showAllCalendars,
    showOnlyCalendar,
    addCalendar,
    updateCalendar,
    deleteCalendar,
    leaveCalendar,
    getCalendarRole,
    profiles,
    sharingAvailable,
    pendingInvites,
    inviteByEmail,
    createInviteLink,
    revokeInvite,
    updateMemberPermission,
    removeMember,
    getInviteInfo,
    acceptInvite,
    declineInvite,
    buildInviteUrl,
    remindersEnabled,
    setRemindersEnabled,
    canEditTask,
    toggleTaskCompletion,
    addTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    getOrganizedTasks,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
    isDataLoading,
    refreshData,
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
