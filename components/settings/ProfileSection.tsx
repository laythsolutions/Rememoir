"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProfile, saveProfile, type UserProfile } from "@/lib/profile";
import { SettingsSection, Field } from "./shared";

export function ProfileSection() {
  const [profile, setProfile] = useState<UserProfile>({ name: "", bio: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const handleSave = () => {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SettingsSection title="Profile">
      <div className="flex flex-col gap-4">
        <Field label="Your name" htmlFor="profile-name">
          <input
            id="profile-name"
            type="text"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder="What should we call you?"
            maxLength={60}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all duration-200"
          />
        </Field>
        <Field label="Journaling intention" htmlFor="profile-bio">
          <textarea
            id="profile-bio"
            value={profile.bio}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            placeholder="Why do you journal? What do you hope to discover?"
            maxLength={500}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 resize-none transition-all duration-200"
          />
          <p className="text-[11px] text-muted-foreground/60 text-right">{profile.bio.length}/500</p>
        </Field>
        <Button
          onClick={handleSave}
          variant={saved ? "outline" : "default"}
          size="sm"
          className="self-start gap-2 rounded-xl cursor-pointer"
        >
          {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : "Save profile"}
        </Button>
      </div>
    </SettingsSection>
  );
}
