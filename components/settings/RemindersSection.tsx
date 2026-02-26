"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  getReminderPrefs,
  saveReminderPrefs,
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  registerPeriodicSync,
  unregisterPeriodicSync,
} from "@/lib/reminders";
import { SettingsSection } from "./shared";

export function RemindersSection() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("20:00");
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(isNotificationSupported());
    setPermission(getNotificationPermission());
    const prefs = getReminderPrefs();
    setEnabled(prefs.enabled);
    setTime(prefs.time);
  }, []);

  const handleToggle = async () => {
    const next = !enabled;
    if (next && permission !== "granted") {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result !== "granted") return; // user denied
    }
    setEnabled(next);
    saveReminderPrefs({ enabled: next });
    if (next) {
      registerPeriodicSync(); // best-effort; requires PWA install + supported browser
    } else {
      unregisterPeriodicSync();
    }
  };

  const handleTimeChange = (t: string) => {
    setTime(t);
    saveReminderPrefs({ time: t });
  };

  if (!supported) return null;

  return (
    <SettingsSection title="Daily reminder">
      <div className="flex flex-col gap-4">
        {/* Toggle row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {enabled
              ? <Bell className="w-4 h-4 text-primary" />
              : <BellOff className="w-4 h-4 text-muted-foreground" />}
            <div>
              <p className="text-[14px] font-medium">
                {enabled ? "Reminder on" : "Daily reminder"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {enabled
                  ? `Notifies you at ${time} if you haven't written`
                  : "Get a nudge to write each day"}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            aria-label={enabled ? "Disable reminder" : "Enable reminder"}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
              enabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Time picker */}
        {enabled && (
          <div className="flex items-center gap-3">
            <label htmlFor="reminder-time" className="text-[13px] text-muted-foreground shrink-0">
              Remind me at
            </label>
            <input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
            />
          </div>
        )}

        {permission === "denied" && (
          <p className="text-[12px] text-destructive leading-relaxed">
            Notifications blocked in your browser. Enable them in browser settings to use reminders.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Reminders appear when Rememoir is open. Install the app to your home screen for background notifications (Android Chrome).
        </p>
      </div>
    </SettingsSection>
  );
}
