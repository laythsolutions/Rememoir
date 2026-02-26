"use client";

const PREF_KEY = "rememoir_reminder_prefs";
const NOTIFIED_KEY = "rememoir_reminder_notified";
const PERIODIC_TAG = "journal-reminder";

export interface ReminderPrefs {
  enabled: boolean;
  /** "HH:MM" in 24-hour local time, e.g. "20:00" */
  time: string;
}

const DEFAULTS: ReminderPrefs = { enabled: false, time: "20:00" };

export function getReminderPrefs(): ReminderPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveReminderPrefs(prefs: Partial<ReminderPrefs>): void {
  const current = getReminderPrefs();
  localStorage.setItem(PREF_KEY, JSON.stringify({ ...current, ...prefs }));
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) return null;
  return Notification.permission;
}

// ─── Periodic Background Sync ─────────────────────────────────────────────────

export function isPeriodicSyncSupported(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return "serviceWorker" in navigator && "periodicSync" in (window as any).ServiceWorkerRegistration?.prototype;
}

/** Register a daily background sync so the SW can show a reminder even when the app is closed. */
export async function registerPeriodicSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-expect-error — Periodic Background Sync API is experimental, no TS types yet
    await reg.periodicSync.register(PERIODIC_TAG, { minInterval: 24 * 60 * 60 * 1000 });
  } catch {
    // Silently fail — requires PWA install + browser support (Chrome on Android)
  }
}

/** Unregister the daily background sync. */
export async function unregisterPeriodicSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-expect-error — Periodic Background Sync API is experimental
    await reg.periodicSync.unregister(PERIODIC_TAG);
  } catch {
    // Ignore
  }
}

/** Show a reminder if: enabled + permission granted + time reached + not yet notified today + not written today */
export function maybeShowReminder(hasWrittenToday: boolean): void {
  if (typeof window === "undefined") return;
  const prefs = getReminderPrefs();
  if (!prefs.enabled) return;
  if (getNotificationPermission() !== "granted") return;
  if (hasWrittenToday) return;

  const now = new Date();
  const [hh, mm] = prefs.time.split(":").map(Number);
  const reminderTime = new Date(now);
  reminderTime.setHours(hh, mm, 0, 0);
  if (now < reminderTime) return;

  // Only notify once per day
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (localStorage.getItem(NOTIFIED_KEY) === todayKey) return;
  localStorage.setItem(NOTIFIED_KEY, todayKey);

  new Notification("Time to journal ✦", {
    body: "Take a few minutes to reflect. Your future self will thank you.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "rememoir-daily",
  });
}
