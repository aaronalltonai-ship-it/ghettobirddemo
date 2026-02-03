# GBird Voice AI (Robotics Hackathon @ LabLab)

Mobile-first “field ops” PWA that pairs ElevenLabs voice design/creation with live vision-style clips. Tuned for LabLab’s robotics track: open on phone, hit Save to Home, trigger voice design via the API routes, and show captured feeds.

## Links
- Live demo: https://ghettobirddemo.vercel.app
- Tech stack: Next.js 16 (App Router), React 19, Turbopack build, CSS modules
- APIs: ElevenLabs text-to-voice design/create

## Features
- Mobile deck UI inspired by GBird reference (status bar, vision feed, voice/comms, telemetry, bottom nav).
- Embedded real clips under Captured clips (5 feeds) plus hero/vision slots pre-bound to red-lens footage.
- Voice Lab backend already wired: `/api/voice/design` (validates description, blocks ethnicity terms), `/api/voice/create` (saves generated voice).
- PWA ready: `manifest.ts`, icons, standalone display; Save-to-Home button in UI.
- Env-driven: preload a voice ID with `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` to show “Ready”.

## Quick start (local)
```bash
npm install
cp .env.example .env.local
# paste secrets
npm run dev
```

## Environment variables
- `ELEVENLABS_API_KEY` (required for design/create routes)
- `ELEVEN_LABS_API_KEY` (duplicate key name for compatibility)
- `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` (optional: preloaded voice)
- `GROQ_API_KEY` (for Groq-powered transcription/LLM calls if enabled later)
- `ELEVENLABS_VOICE_ID` (server-side voice for TTS replies; use same as NEXT_PUBLIC if needed)

## Scripts
- `npm run dev` – Next dev (Turbopack)
- `npm run build` – Production build (uses .env.local)
- `npm start` – Serve production build

## API routes
- `POST /api/voice/design`
  - body: `{ voice_description: string (>=20 chars, <=1000), text?: string (100-1000), model_id?: string }`
  - rejects descriptions containing blocked terms (ethnicity-coded words)
- `POST /api/voice/create`
  - body: `{ voice_name, voice_description, generated_voice_id, labels?, played_not_selected_voice_ids? }`

## Assets
- Clips in `public/clips/`: `wooden-gate`, `alley`, `alley-zoom`, `red-lens-overlook`, `red-lens-left-pan` (all mp4).
- Logo `public/gbird-logo.png`; PWA icons at `public/icons/`.

## Demo flow (hackathon-ready, 3–5 min)
1) Open https://ghettobirddemo.vercel.app on mobile; tap “Save to Home” (PWA proof).
2) Hero + Vision: red-lens feeds autoplay inline → talk safety & low-alt ops (≤40 ft).
3) Voice control: hit quick chips; explain ElevenLabs pipeline (design → create) + blocked-term safety.
4) Captured clips: play alley/overlook/left-pan to show navigation realism.
5) If secrets loaded: POST `/api/voice/design` with neutral prompt → preview → POST `/api/voice/create` → set `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` to preload.

## Deployment
- Already live on Vercel. Redeploy: `vercel deploy --prod --yes` from repo root.
- Ensure secrets are set in Vercel Project Settings ? Environment Variables.

## Architecture snapshot
- `src/app/page.tsx` – UI layout matching reference markup.
- `src/app/page.module.css` – Bird-themed mobile styling.
- `src/app/api/voice/design/route.ts` – ElevenLabs design proxy with validation.
- `src/app/api/voice/create/route.ts` – ElevenLabs create proxy.
- `public/clips/` – demo footage.

## Troubleshooting
- Build fails with CSS purity errors: ensure global selectors are prefixed with `:global` (already handled).
- ElevenLabs 400: check description length and blocked terms; verify `ELEVENLABS_API_KEY` is set.
- Video autoplay on iOS: keep videos muted; they are pre-set to `muted autoPlay playsInline`.

## To publish on GitHub
1) `git init && git add . && git commit -m "chore: add hackathon README"`
2) Create a repo on GitHub, then:
   ```bash
   git remote add origin https://github.com/<you>/ghettobirddemo.git
   git push -u origin main
   ```
(We can’t push from here without your GitHub creds, but the repo is ready.)
