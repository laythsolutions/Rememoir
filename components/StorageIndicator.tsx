"use client";

import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";

interface StorageInfo {
  usedMB: number;
  quotaMB: number;
  percent: number;
}

export function StorageIndicator() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!("storage" in navigator && "estimate" in navigator.storage)) {
      setAvailable(false);
      return;
    }
    setAvailable(true);
    navigator.storage.estimate().then(({ usage, quota }) => {
      if (!usage || !quota) return;
      setInfo({
        usedMB: usage / 1024 / 1024,
        quotaMB: quota / 1024 / 1024,
        percent: Math.round((usage / quota) * 100),
      });
    });
  }, []);

  if (available === false) return null;

  if (!info) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-muted rounded-full" />
          <div className="h-3 w-28 bg-muted/60 rounded-full" />
        </div>
        <div className="h-1.5 bg-muted rounded-full" />
      </div>
    );
  }

  const isWarning = info.percent > 70;
  const isDanger = info.percent > 90;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <HardDrive className="w-4 h-4" />
          Storage
        </span>
        <span className={`text-xs font-medium ${isDanger ? "text-destructive" : isWarning ? "text-amber-500" : "text-muted-foreground"}`}>
          {info.usedMB.toFixed(1)} MB / {info.quotaMB.toFixed(0)} MB ({info.percent}%)
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isDanger ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${Math.min(info.percent, 100)}%` }}
        />
      </div>
      {isDanger && (
        <p className="text-xs text-destructive">
          Storage almost full. Export your data and consider self-hosting.
        </p>
      )}
    </div>
  );
}
