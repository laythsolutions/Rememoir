const PROFILE_KEY = "rememoir_profile";

export interface UserProfile {
  /** Display name shown in home screen greeting */
  name: string;
  /** Personal bio or journaling intention */
  bio: string;
}

const DEFAULT_PROFILE: UserProfile = { name: "", bio: "" };

export function getProfile(): UserProfile {
  if (typeof localStorage === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
