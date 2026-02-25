# Rememoir

A local-first private journaling PWA. Everything stays on your device — no accounts, no sync, no telemetry.

## Features

- **Journal entries** — text, with optional audio (30s) and video (60s) recording
- **Transcription** — Web Speech API auto-transcribes recordings
- **Tags** — chip-style tagging with full tag filter in the timeline
- **Full-text search** — instant in-memory search via MiniSearch
- **Timeline** — infinite scroll list or calendar view
- **Insights** — 30-day activity chart, writing habit breakdown
- **My Story** — Life Memories archive + freeform About Me sections
- **Export / Import** — JSON backup and PDF export; JSON import with duplicate detection
- **PWA** — installable, offline-capable, works without a network
- **Dark mode** — system-aware with manual toggle, no flash on load
- **Docker** — single-container deployment

## Stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Storage | Dexie (IndexedDB) + OPFS (media) |
| State | Zustand |
| Search | MiniSearch |
| Charts | Recharts |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

> `npm run build` uses `--webpack` because next-pwa requires Webpack (Next.js 16 defaults to Turbopack).

### Docker

```bash
docker build -t rememoir .
docker run -p 3000:3000 rememoir
```

## Privacy

All data is stored locally in your browser's IndexedDB and OPFS. No data ever leaves your device. There is no backend, no analytics, and no telemetry of any kind.

## License

MIT
