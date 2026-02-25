// ─── Static "About Me" sections ──────────────────────────────────────────────

const AUTOBIOGRAPHY_KEY = "rememoir_autobiography";

export interface AutobiographySections {
  whoIAm: string;
  myJourney: string;
  whatIBelieve: string;
  workingToward: string;
  formativeMemory: string;
  updatedAt?: string;
}

const DEFAULT_SECTIONS: AutobiographySections = {
  whoIAm: "",
  myJourney: "",
  whatIBelieve: "",
  workingToward: "",
  formativeMemory: "",
};

export function getAutobiography(): AutobiographySections {
  if (typeof localStorage === "undefined") return DEFAULT_SECTIONS;
  try {
    const raw = localStorage.getItem(AUTOBIOGRAPHY_KEY);
    if (!raw) return DEFAULT_SECTIONS;
    return { ...DEFAULT_SECTIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SECTIONS;
  }
}

export function saveAutobiography(sections: AutobiographySections): void {
  localStorage.setItem(
    AUTOBIOGRAPHY_KEY,
    JSON.stringify({ ...sections, updatedAt: new Date().toISOString() })
  );
}

// ─── Life Memory entries ──────────────────────────────────────────────────────

const MEMORIES_KEY = "rememoir_memories";

export interface LifeMemory {
  id: string;
  /** Free-text era label: "Childhood", "2010–2015", "My 20s", "Last year", etc. */
  era: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function loadMemories(): LifeMemory[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    return raw ? (JSON.parse(raw) as LifeMemory[]) : [];
  } catch {
    return [];
  }
}

function persistMemories(memories: LifeMemory[]): void {
  localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
}

export function getMemories(): LifeMemory[] {
  return loadMemories();
}

export function addMemory(
  data: Pick<LifeMemory, "era" | "title" | "content">
): LifeMemory {
  const now = new Date().toISOString();
  const memory: LifeMemory = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    era: data.era.trim(),
    title: data.title.trim(),
    content: data.content.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const memories = loadMemories();
  memories.unshift(memory); // newest first
  persistMemories(memories);
  return memory;
}

export function updateMemory(
  id: string,
  changes: Partial<Pick<LifeMemory, "era" | "title" | "content">>
): void {
  const memories = loadMemories().map((m) =>
    m.id === id
      ? { ...m, ...changes, updatedAt: new Date().toISOString() }
      : m
  );
  persistMemories(memories);
}

export function deleteMemory(id: string): void {
  persistMemories(loadMemories().filter((m) => m.id !== id));
}
