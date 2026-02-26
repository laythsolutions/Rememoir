"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { StorageIndicator } from "@/components/StorageIndicator";
import { getEntryCount } from "@/lib/db";
import { SettingsSection } from "./shared";

export function StorageSection() {
  const [entryCount, setEntryCount] = useState<number | null>(null);

  return (
    <SettingsSection title="Storage">
      <div className="flex flex-col gap-4">
        <StorageIndicator />
        <Separator />
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Total entries</span>
          {entryCount === null ? (
            <button
              onClick={() => getEntryCount().then(setEntryCount)}
              className="text-primary hover:text-primary/80 text-xs font-medium cursor-pointer"
            >
              Load count
            </button>
          ) : (
            <span className="font-semibold tabular-nums">{entryCount}</span>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
