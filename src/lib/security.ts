/**
 * Input validation & sanitisation helpers.
 *
 * React already escapes text rendered through JSX, so XSS is mainly a risk from
 * (a) raw HTML sinks, (b) URL schemes in href/src, and (c) CSS values built from
 * user data. These helpers enforce strict, allow-list based validation for every
 * value that crosses a trust boundary (form input, URL, localStorage, DB rows
 * written by collaborators). The database enforces the same limits (see
 * supabase/schema.sql, section 13) so the checks here are defence in depth.
 */

import type { Task, Client, Project, Calendar } from '../types';

export const LIMITS = {
  NAME: 120,
  TITLE: 200,
  SHORT: 120,
  EMAIL: 254,
  PHONE: 32,
  DESCRIPTION: 5000,
  NOTES: 5000,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  MAX_MONEY: 1_000_000_000,
} as const;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‎‏‪-‮⁦-⁩]/g;

/**
 * Removes control characters and bidi-override characters (used for spoofing),
 * normalises to NFC and enforces a max length. Newlines/tabs are preserved.
 */
export const cleanText = (value: unknown, max: number): string => {
  if (typeof value !== 'string') return '';
  return value.normalize('NFC').replace(CONTROL_CHARS, '').slice(0, max);
};

/** Single-line variant: collapses all whitespace (including newlines) and trims. */
export const cleanLine = (value: unknown, max: number): string =>
  cleanText(value, max * 2).replace(/\s+/g, ' ').trim().slice(0, max);

/** Multi-line variant: trims the ends only. */
export const cleanMultiline = (value: unknown, max: number): string =>
  cleanText(value, max).trim();

// Practical RFC 5322 subset; no whitespace, quotes, angle brackets or control characters.
const EMAIL_REGEX = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= LIMITS.EMAIL && EMAIL_REGEX.test(value);

/** Returns a normalised email or '' when invalid. */
export const cleanEmail = (value: unknown): string => {
  const v = cleanLine(value, LIMITS.EMAIL).toLowerCase();
  return isValidEmail(v) ? v : '';
};

const PHONE_REGEX = /^[+()\d\s.\-/]{3,32}$/;
export const cleanPhone = (value: unknown): string => {
  const v = cleanLine(value, LIMITS.PHONE);
  return PHONE_REGEX.test(v) ? v : '';
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
/** Only plain hex colours are accepted so a value can never smuggle `url(...)` into a style. */
export const safeColor = (value: unknown, fallback = '#6366f1'): string =>
  typeof value === 'string' && HEX_COLOR.test(value.trim()) ? value.trim() : fallback;

const CURRENCY = /^[A-Za-z]{3}$/;
export const safeCurrency = (value: unknown, fallback = 'EUR'): string =>
  typeof value === 'string' && CURRENCY.test(value.trim()) ? value.trim().toUpperCase() : fallback;

/** Finite number clamped to [0, max]; anything else becomes 0. */
export const safeMoney = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n * 100) / 100, LIMITS.MAX_MONEY);
};

export const safeInt = (value: unknown, min: number, max: number): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (value === null || value === undefined || value === '' || !Number.isInteger(n)) return null;
  return Math.min(max, Math.max(min, n));
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const safeTime = (value: unknown): string | null =>
  typeof value === 'string' && TIME_REGEX.test(value) ? value : null;

/** Invite tokens are 64 hex characters (see calendar_invites.token). */
const INVITE_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;
export const isValidInviteToken = (value: unknown): value is string =>
  typeof value === 'string' && INVITE_TOKEN.test(value);

/**
 * Builds a mailto: link. The address is validated (so it can't inject extra
 * headers such as `?bcc=`) and every component is percent-encoded.
 * Returns undefined when the address is invalid so callers can skip the link.
 */
export const safeMailto = (
  address: unknown,
  params?: { subject?: string; body?: string }
): string | undefined => {
  const to = cleanEmail(address);
  if (!to) return undefined;
  const q: string[] = [];
  if (params?.subject) q.push(`subject=${encodeURIComponent(params.subject)}`);
  if (params?.body) q.push(`body=${encodeURIComponent(params.body)}`);
  return `mailto:${encodeURIComponent(to).replace(/%40/g, '@')}${q.length ? `?${q.join('&')}` : ''}`;
};

/** window.open wrapper that always severs the opener relationship. */
export const openExternal = (url: string): void => {
  if (!/^(https:|mailto:)/i.test(url)) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Wraps an SVG string into a data URI for use in <img src>. Browsers never run
 * scripts, load sub-resources or access the DOM from an SVG used as an image,
 * which makes this safe even if the SVG source were attacker influenced.
 */
export const svgToImageSrc = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// ---------------------------------------------------------------------------
// Domain sanitisers: allow-list the keys, validate every value, drop the rest.
// They accept partial objects so they can be used for both inserts and updates.
// ---------------------------------------------------------------------------

const TASK_STATUS = ['pending', 'in_progress', 'completed'] as const;
const TASK_PRIORITY = ['low', 'medium', 'high'] as const;
const TASK_SCOPE = ['projects', 'freelance', 'agenda'] as const;
const PROJECT_STATUS = ['pending', 'in_progress', 'completed', 'archived'] as const;

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export const sanitizeTaskPatch = <T extends Partial<Task>>(input: T): T => {
  const out: Partial<Task> = { ...input };
  if ('title' in out) out.title = cleanLine(out.title, LIMITS.TITLE);
  if ('description' in out) out.description = cleanMultiline(out.description, LIMITS.DESCRIPTION) || undefined;
  if ('status' in out) out.status = oneOf(out.status, TASK_STATUS) ?? 'pending';
  if ('priority' in out) out.priority = oneOf(out.priority, TASK_PRIORITY) ?? 'medium';
  if ('scope' in out) out.scope = oneOf(out.scope, TASK_SCOPE) ?? 'agenda';
  if ('due_time' in out) out.due_time = safeTime(out.due_time);
  if ('duration_minutes' in out) out.duration_minutes = safeInt(out.duration_minutes, 1, 24 * 60);
  if ('remind_before' in out) out.remind_before = safeInt(out.remind_before, 0, 7 * 24 * 60);
  if ('order_index' in out) out.order_index = safeInt(out.order_index, -1_000_000, 1_000_000) ?? 0;
  return out as T;
};

export const sanitizeClientPatch = <T extends Partial<Client>>(input: T): Partial<Client> => {
  const out: Partial<Client> = {};
  if ('name' in input) out.name = cleanLine(input.name, LIMITS.NAME);
  if ('company' in input) out.company = cleanLine(input.company, LIMITS.NAME) || undefined;
  if ('email' in input) out.email = cleanEmail(input.email) || undefined;
  if ('phone' in input) out.phone = cleanPhone(input.phone) || undefined;
  if ('hourly_rate' in input) out.hourly_rate = safeMoney(input.hourly_rate);
  if ('currency' in input) out.currency = safeCurrency(input.currency);
  if ('notes' in input) out.notes = cleanMultiline(input.notes, LIMITS.NOTES) || undefined;
  return out;
};

export const sanitizeProjectPatch = <T extends Partial<Project>>(input: T): Partial<Project> => {
  const out: Partial<Project> = {};
  if ('title' in input) out.title = cleanLine(input.title, LIMITS.TITLE);
  if ('description' in input) out.description = cleanMultiline(input.description, LIMITS.DESCRIPTION) || undefined;
  if ('budget' in input) out.budget = safeMoney(input.budget);
  if ('quoted_price' in input) out.quoted_price = safeMoney(input.quoted_price);
  if ('invoiced_amount' in input) out.invoiced_amount = safeMoney(input.invoiced_amount);
  if ('status' in input) out.status = oneOf(input.status, PROJECT_STATUS) ?? 'pending';
  if ('client_id' in input) out.client_id = input.client_id;
  if ('deadline' in input) out.deadline = input.deadline;
  return out;
};

export const sanitizeCalendarPatch = (
  input: Partial<Pick<Calendar, 'name' | 'color' | 'description'>>
): Partial<Pick<Calendar, 'name' | 'color' | 'description'>> => {
  const out: Partial<Pick<Calendar, 'name' | 'color' | 'description'>> = {};
  if ('name' in input) out.name = cleanLine(input.name, LIMITS.NAME) || 'Untitled';
  if ('color' in input) out.color = safeColor(input.color);
  if ('description' in input) out.description = cleanMultiline(input.description, 500) || undefined;
  return out;
};
