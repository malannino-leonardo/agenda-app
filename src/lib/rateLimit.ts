/**
 * Rate Limiter for Client-Side Security & Brute-Force Protection
 *
 * Implements a robust sliding-window rate limiter with progressive lockouts.
 * Persists attempts across page refreshes using localStorage with in-memory fallback.
 */

interface RateLimitRecord {
  timestamps: number[];
  lockedUntil?: number;
  consecutiveLockouts?: number;
}

const memoryStore = new Map<string, RateLimitRecord>();
const STORAGE_PREFIX = 'agenda_rl_';

const getStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Storage restricted or unavailable
  }
  return null;
};

/** localStorage can be edited by the user (or corrupted): never trust its shape. */
const sanitizeRecord = (raw: unknown): RateLimitRecord => {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<RateLimitRecord>;
  const now = Date.now();
  return {
    timestamps: Array.isArray(r.timestamps)
      ? r.timestamps.filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t <= now).slice(-200)
      : [],
    lockedUntil: typeof r.lockedUntil === 'number' && Number.isFinite(r.lockedUntil) ? r.lockedUntil : undefined,
    consecutiveLockouts:
      typeof r.consecutiveLockouts === 'number' && Number.isFinite(r.consecutiveLockouts)
        ? Math.min(10, Math.max(0, Math.floor(r.consecutiveLockouts)))
        : 0,
  };
};

const getRecord = (key: string): RateLimitRecord => {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_PREFIX + key);
      if (raw) return sanitizeRecord(JSON.parse(raw));
    } catch {
      // Fallback to memory
    }
  }
  return memoryStore.get(key) || { timestamps: [] };
};

const saveRecord = (key: string, record: RateLimitRecord): void => {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_PREFIX + key, JSON.stringify(record));
    } catch {
      // Storage quota or restriction
    }
  }
  memoryStore.set(key, record);
};

export interface RateLimitCheckResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  baseCooldownMs: number;
}

export const RATE_LIMIT_CONFIGS = {
  SIGN_IN: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute window
    baseCooldownMs: 30 * 1000, // 30 seconds initial cooldown
  },
  SIGN_UP: {
    maxAttempts: 3,
    windowMs: 60 * 1000, // 1 minute window
    baseCooldownMs: 60 * 1000, // 60 seconds cooldown
  },
  PASSWORD_CHANGE: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes window
    baseCooldownMs: 60 * 1000, // 60 seconds cooldown
  },
  EMAIL_CHANGE: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes window
    baseCooldownMs: 60 * 1000, // 60 seconds cooldown
  },
  ACCOUNT_DELETE: {
    maxAttempts: 2,
    windowMs: 10 * 60 * 1000, // 10 minutes window
    baseCooldownMs: 2 * 60 * 1000, // 2 minutes cooldown
  },
  SIGN_IN_DEVICE: {
    // Caps credential stuffing across many e-mail addresses from the same browser
    maxAttempts: 20,
    windowMs: 10 * 60 * 1000,
    baseCooldownMs: 2 * 60 * 1000,
  },
  TASK_UPDATE: {
    maxAttempts: 80,
    windowMs: 10 * 1000,
    baseCooldownMs: 5 * 1000,
  },
  TASK_DELETE: {
    maxAttempts: 40,
    windowMs: 10 * 1000,
    baseCooldownMs: 5 * 1000,
  },
  ENTITY_UPDATE: {
    maxAttempts: 30,
    windowMs: 10 * 1000,
    baseCooldownMs: 5 * 1000,
  },
  ENTITY_DELETE: {
    maxAttempts: 20,
    windowMs: 10 * 1000,
    baseCooldownMs: 5 * 1000,
  },
  CALENDAR_CREATE: {
    maxAttempts: 5,
    windowMs: 60 * 1000,
    baseCooldownMs: 30 * 1000,
  },
  INVITE_CREATE: {
    maxAttempts: 10,
    windowMs: 60 * 1000,
    baseCooldownMs: 30 * 1000,
  },
  INVITE_LOOKUP: {
    // Slows token guessing against get_invite_info / accept_calendar_invite
    maxAttempts: 15,
    windowMs: 60 * 1000,
    baseCooldownMs: 60 * 1000,
  },
  TASK_CREATE: {
    maxAttempts: 25,
    windowMs: 10 * 1000, // 10 seconds window
    baseCooldownMs: 5 * 1000, // 5 seconds cooldown
  },
  PROJECT_CREATE: {
    maxAttempts: 10,
    windowMs: 10 * 1000, // 10 seconds window
    baseCooldownMs: 5 * 1000, // 5 seconds cooldown
  },
  CLIENT_CREATE: {
    maxAttempts: 10,
    windowMs: 10 * 1000, // 10 seconds window
    baseCooldownMs: 5 * 1000, // 5 seconds cooldown
  },
} as const;

/**
 * Checks if an operation is currently permitted under rate limit policy.
 */
export const checkRateLimit = (
  key: string,
  config: RateLimitConfig
): RateLimitCheckResult => {
  const now = Date.now();
  const record = getRecord(key);

  // Check active lockout
  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // Filter timestamps within current sliding window
  const activeTimestamps = (record.timestamps || []).filter(
    (t) => now - t < config.windowMs
  );

  const remaining = Math.max(0, config.maxAttempts - activeTimestamps.length);

  // Window full but no active lockout: report when the oldest attempt leaves the window
  const retryAfterSeconds =
    remaining > 0 ? 0 : Math.max(1, Math.ceil((Math.min(...activeTimestamps) + config.windowMs - now) / 1000));

  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    retryAfterSeconds,
  };
};

/**
 * Records an attempt and imposes lockout if maximum attempts are exceeded.
 */
export const recordRateLimitAttempt = (
  key: string,
  config: RateLimitConfig
): RateLimitCheckResult => {
  const now = Date.now();
  const record = getRecord(key);

  // If already locked, calculate remaining time
  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // Filter timestamps within sliding window
  const activeTimestamps = (record.timestamps || []).filter(
    (t) => now - t < config.windowMs
  );
  activeTimestamps.push(now);

  // Escalation decays after a quiet period (10 windows past the last lockout)
  const quiet = record.lockedUntil !== undefined && now - record.lockedUntil > config.windowMs * 10;
  const consecutive = quiet ? 0 : record.consecutiveLockouts || 0;

  if (activeTimestamps.length >= config.maxAttempts) {
    // Progressive cooldown: doubles with each consecutive lockout up to 10x
    const multiplier = Math.min(10, Math.pow(2, consecutive));
    const lockoutDuration = config.baseCooldownMs * multiplier;
    const lockedUntil = now + lockoutDuration;

    // Start a fresh window once the cooldown ends (otherwise old attempts keep the user blocked)
    saveRecord(key, {
      timestamps: [],
      lockedUntil,
      consecutiveLockouts: consecutive + 1,
    });

    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(lockoutDuration / 1000),
    };
  }

  saveRecord(key, {
    timestamps: activeTimestamps,
    consecutiveLockouts: consecutive,
  });

  return {
    allowed: true,
    remainingAttempts: config.maxAttempts - activeTimestamps.length,
    retryAfterSeconds: 0,
  };
};

/**
 * Resets rate limit tracking on successful action.
 */
export const resetRateLimit = (key: string): void => {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Ignore
    }
  }
  memoryStore.delete(key);
};

/**
 * Convenience: check + record in one call. Returns the result of the check;
 * when `allowed` is false the action must not proceed.
 */
export const consumeRateLimit = (
  key: string,
  config: RateLimitConfig
): RateLimitCheckResult => {
  const check = checkRateLimit(key, config);
  if (!check.allowed) return check;
  return recordRateLimitAttempt(key, config);
};
