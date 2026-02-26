# Rememoir

A local-first private journaling PWA. Everything lives on your device — no accounts, no cloud, no telemetry. Optional BYOK AI (bring-your-own Claude key) for smart features without compromising privacy.

## Features

### Core journaling
- **Rich entries** — text with optional audio (30 s) and video (60 s) recording
- **Transcription** — Web Speech API auto-transcribes recordings into the entry
- **Inline editing** — edit any past entry directly in the timeline without leaving the page
- **Tags** — chip-style tagging; filter the timeline by one or more tags
- **Star / bookmark** — star important entries; filter to starred-only in the timeline
- **Full-text search** — instant in-memory search via MiniSearch (searches text and tags)
- **Writing templates** — pre-built structures (Gratitude, Reflection, Weekly Review, etc.) to start faster

### Timeline & navigation
- **Infinite scroll timeline** — entries grouped by month with sticky month dividers
- **Calendar view** — month grid with dots on days that have entries; tap a day to jump to it
- **Date range filter** — narrow the timeline to any from/to date window
- **Starred filter** — one tap to see only your bookmarked entries

### Home dashboard
- **Smart home** — returning-user dashboard vs. first-run onboarding flow
- **Streak tracking** — current streak + streak-at-risk nudge if you haven't written today
- **Weekly digest** — entry count, days written, avg word count, dominant sentiment, top tag for the last 7 days
- **On This Day** — entries from the same calendar date in previous years
- **Writing goal progress** — "Goal: 3/5 days" stat pill tracks your weekly target
- **Daily prompt card** — rotates across built-in + your own custom prompts
- **Backup nudge** — reminds you to export if it's been more than 7 days

### AI (optional, BYOK)
Bring your own Anthropic API key — AI features run via your key, keeping data off third-party servers.

- **Sentiment analysis** — positive / reflective / challenging / neutral pill on each entry
- **Entry summary** — one-sentence AI summary shown below the sentiment
- **Tag suggestions** — AI suggests relevant tags based on entry content
- **Manual sentiment override** — tap the sentiment pill to correct it
- **Personalised writing prompt** — AI generates a prompt based on your recent entries
- **Autobiography draft** — AI drafts a life narrative from your Journal + My Story data

### Insights
- **30-day activity chart** — word count per day (Recharts area chart)
- **Pattern insights** — when you journal most (morning/afternoon/evening/night) and emotional tone per tag
- **Sentiment distribution** — breakdown of all sentiment labels across your entries
- **Streak & stats** — longest streak, total words, average entry length

### My Story
- **Life Memories** — freeform cards for significant life events, people, places
- **About Me** — structured sections (values, strengths, goals, etc.)
- **AI autobiography** — one-click draft from all your data (requires AI key)

### Privacy & security
- **AES-GCM encryption** — optional passphrase encrypts entry text and tags at rest (PBKDF2 key derivation, 310,000 iterations)
- **PIN lock** — 4-digit PIN screen guards the app on shared devices
- **Zero telemetry** — no analytics, no error reporting, no network calls (except optional AI via your own key)

### Import / Export
| Format | Import | Export |
|---|---|---|
| Rememoir JSON | ✓ auto-detect | ✓ full backup |
| Day One JSON | ✓ auto-detect | — |
| Markdown `.md` | ✓ date-heading split | — |
| Plain text `.txt` | ✓ whole file as entry | — |
| PDF | — | ✓ readable journal |
| Therapy Brief PDF | — | ✓ structured clinical summary |

Duplicate detection on import (by timestamp). Day One tags are normalised to lowercase-hyphenated.

### Auto-backup
- Pick any local folder via File System Access API
- A dated JSON snapshot is written automatically after every new entry
- **Free cross-device sync tip:** pick a folder inside iCloud Drive, Google Drive, or Dropbox

### Notifications & reminders
- **In-app reminders** — configurable frequency (daily / every 3 days / weekly / off); shown when the app is open
- **Periodic Background Sync** — background journal reminders on Android Chrome when the PWA is installed

### Writing motivation
- **Daily prompts** — 15 built-in prompts rotate daily; add unlimited custom prompts
- **Weekly writing goal** — set a target (3 / 5 / 7 days per week); progress shown on the home screen
- **Crisis detection** — detects distress patterns in entries and surfaces a mental health support banner

### PWA
- Installable on Android (Chrome), iOS (Safari → Add to Home Screen), and desktop
- Fully offline-capable after first load
- Service worker managed by `@ducanh2912/next-pwa`

---

## Stack

| Layer | Library / version |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Radix UI |
| Storage | Dexie v4 (IndexedDB) + OPFS (media) |
| State | Zustand |
| Search | MiniSearch |
| Charts | Recharts |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| PDF | jsPDF |
| Toasts | Sonner |
| Tests | Vitest + happy-dom |

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build   # uses --webpack (next-pwa requires Webpack, not Turbopack)
npm start
```

### Docker

```bash
docker build -t rememoir .
docker run -p 3000:3000 rememoir
```

### Tests

```bash
npx vitest run
```

---

## AI setup (optional)

1. Open **Settings → AI**
2. Paste your [Anthropic API key](https://console.anthropic.com/) — stored only in your browser's localStorage
3. AI features activate immediately; remove the key at any time to disable

Models used:
- `claude-haiku-4-5` — sentiment analysis, tag suggestions, personalised prompts (fast, cheap)
- `claude-sonnet-4-6` — autobiography drafting (best quality)

---

## Encryption setup (optional)

1. Open **Settings → Security → Enable encryption**
2. Set a passphrase — used to derive an AES-GCM key via PBKDF2
3. All new entries are encrypted at rest; existing entries are re-encrypted on save

> **Important:** if you forget your passphrase, your encrypted entries cannot be recovered. Export a plaintext backup before enabling.

---

## Privacy

All data is stored locally in your browser's IndexedDB and OPFS. The app makes no network requests except:
- Anthropic API calls — only if you add your own key in Settings
- Nothing else

No backend. No accounts. No analytics. No telemetry.

---

## License

MIT
