export interface MediaRef {
  /** OPFS file path relative to the Rememoir root */
  path: string;
  /** MIME type e.g. audio/webm, audio/mp4, video/webm */
  mimeType: string;
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  size: number;
}

export interface ImageRef {
  /** OPFS file path relative to the Rememoir root */
  path: string;
  /** MIME type e.g. image/jpeg, image/png, image/webp */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

export interface RememoirEntry {
  /** Auto-incremented primary key */
  id?: number;
  /** ISO timestamp string */
  createdAt: string;
  /** Last edited ISO timestamp */
  updatedAt: string;
  /** Journal text content */
  text: string;
  /** User-defined tags, lowercase alphanumeric + hyphens */
  tags?: string[];
  /** The prompt this entry responded to, if any */
  promptId?: number;
  /** Optional audio recording reference in OPFS */
  audio?: MediaRef;
  /** Optional video recording reference in OPFS */
  video?: MediaRef;
  /** Optional photo attachments stored in OPFS */
  images?: ImageRef[];
  /** Whether this entry was deleted (soft delete for sync) */
  deleted?: boolean;
  /** Whether this entry is starred/bookmarked */
  starred?: boolean;
  /** AI-generated insight — populated asynchronously after save */
  aiInsight?: AIInsight;
}

export interface AIInsight {
  sentiment: 'positive' | 'reflective' | 'challenging' | 'neutral';
  /** 1 = mild, 5 = intense — how strongly the sentiment is expressed */
  intensity?: 1 | 2 | 3 | 4 | 5;
  summary: string;
  suggestedTags: string[];
  analyzedAt: string; // ISO
}

export interface SearchDocument {
  id: number;
  text: string;
  createdAt: string;
  tags: string;
}
