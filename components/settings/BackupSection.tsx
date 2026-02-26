"use client";

import { useState, useEffect } from "react";
import { FolderOpen, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAutoBackupSupported, pickBackupFolder, getBackupFolderName, clearBackupFolder } from "@/lib/autobackup";
import { SettingsSection } from "./shared";

export function BackupSection() {
  const [supported, setSupported] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    setSupported(isAutoBackupSupported());
    getBackupFolderName().then(setFolderName);
  }, []);

  if (!supported) return null;

  const handlePick = async () => {
    setPicking(true);
    const name = await pickBackupFolder();
    if (name) setFolderName(name);
    setPicking(false);
  };

  const handleClear = async () => {
    await clearBackupFolder();
    setFolderName(null);
  };

  return (
    <SettingsSection title="Auto-backup">
      <div className="flex flex-col gap-3">
        {folderName ? (
          <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-green-500/8 border border-green-500/20">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-foreground/90">{folderName}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">JSON backup saved here after each entry</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
              aria-label="Remove backup folder"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Choose a local folder and Rememoir will automatically save a JSON backup there after every new entry.
          </p>
        )}

        <Button
          variant="outline"
          onClick={handlePick}
          disabled={picking}
          className="gap-2 rounded-xl cursor-pointer self-start"
        >
          <FolderOpen className="w-4 h-4" />
          {folderName ? "Change folder" : "Choose backup folder"}
        </Button>

        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          Requires desktop Chrome or Edge. Your data never leaves your device.
        </p>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15">
          <span className="text-primary shrink-0 mt-0.5 text-[13px]">💡</span>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground/80">Free cross-device sync: </span>
            pick a folder inside iCloud Drive, Google Drive, or Dropbox. Backups sync automatically across all your devices.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
