import { useCallback, useEffect, useRef, useState } from 'react';
import { Task } from '../types';
import { parseDateKey, taskDateKey, timeToMinutes, formatTimeLabel } from '../lib/calendarUtils';

const ENABLED_KEY = 'agenda_reminders_enabled';
const FIRED_KEY = 'agenda_fired_reminders';
const CHECK_INTERVAL_MS = 20000;
/** Reminders for events that started more than this long ago are considered missed and skipped. */
const MISSED_AFTER_MS = 30 * 60 * 1000;

const readEnabled = (): boolean => {
  try {
    return localStorage.getItem(ENABLED_KEY) !== '0';
  } catch {
    return true;
  }
};

const readFired = (): string[] => {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFired = (ids: string[]) => {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(ids.slice(-300)));
  } catch {
    // ignore
  }
};

interface Options {
  tasks: Task[];
  active: boolean;
  onReminder: (message: string) => void;
}

/**
 * In-app + browser notifications for tasks that have a start time and a "remind me before" offset.
 * Works while the app (or installed PWA) is open.
 */
export const useTaskReminders = ({ tasks, active, onReminder }: Options) => {
  const [enabled, setEnabledState] = useState<boolean>(readEnabled);
  const tasksRef = useRef(tasks);
  const onReminderRef = useRef(onReminder);
  tasksRef.current = tasks;
  onReminderRef.current = onReminder;

  const setEnabled = useCallback(async (next: boolean) => {
    setEnabledState(next);
    try {
      localStorage.setItem(ENABLED_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore: in-app toasts still work
      }
    }
  }, []);

  useEffect(() => {
    if (!active || !enabled) return;

    const check = () => {
      const now = Date.now();
      const fired = readFired();
      let changed = false;

      for (const task of tasksRef.current) {
        if (task.status === 'completed' || task.remind_before == null) continue;
        const dateKey = taskDateKey(task);
        const startMin = timeToMinutes(task.due_time);
        if (!dateKey || startMin === null) continue;

        const start = parseDateKey(dateKey);
        start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
        const startMs = start.getTime();
        const fireAt = startMs - task.remind_before * 60000;
        if (now < fireAt || now > startMs + MISSED_AFTER_MS) continue;

        const signature = `${task.id}|${dateKey}|${task.due_time}|${task.remind_before}`;
        if (fired.includes(signature)) continue;
        fired.push(signature);
        changed = true;

        const time = formatTimeLabel(task.due_time, navigator.language || 'en');
        const message = `${task.title} · ${time}`;
        onReminderRef.current(message);
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(task.title, { body: time, tag: signature, icon: '/pwa-192x192.png' });
          } catch {
            // Some mobile browsers only allow notifications through a service worker
          }
        }
      }

      if (changed) writeFired(fired);
    };

    check();
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active, enabled]);

  return { enabled, setEnabled };
};
