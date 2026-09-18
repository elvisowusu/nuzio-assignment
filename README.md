# Nuzio — personalised morning audio news

### ▶ Live demo — **https://nuzio-pink.vercel.app**

Tap **Continue as guest** to go straight to the brief. No setup, no keys, real headlines from this morning, narrated by neural voices.

**Android APK** — [download and sideload](https://expo.dev/artifacts/eas/9Bw8zgQuJd9xkYzhBagFSwVAdDgAI-39Ak59Hj5M2Tg.apk) (105 MB) to run the real native app.

API: `https://nuzio-api-production.up.railway.app` · health check: [`/api/health`](https://nuzio-api-production.up.railway.app/api/health)

---

Assignment build for **Olinp**. Two flows from the Nuzio design system, built end to end:

| Figma screen | Built |
|---|---|
| **02 LOGIN** — "Good morning. News on go." | `mobile/app/login.tsx` |
| **09 MORNING BRIEF** — playing personalised news | `mobile/app/brief.tsx` |

The design is a mobile product (status bars, bottom tabs, swipe), so this is a **real React Native app**. It also exports to web from the same codebase, so it can be reviewed from a link without installing anything.

---

## Run it

Two terminals, from the repo root.

**1 — backend**

```bash
cd server && pnpm install && pnpm setup && pnpm dev
```

`pnpm setup` generates the Prisma client, creates the SQLite database and seeds 22 stories. The API comes up on `http://localhost:4000`.

**2 — app**

```bash
cd mobile && pnpm install && pnpm start
```

Then press `w` for web, `i` for iOS, or `a` for Android — or scan the QR with Expo Go.

It runs with **no API keys at all** — and still serves real, live news. Sign in with *Continue as guest*; headlines come from Google News RSS (no key, no cap) and narration falls back to on-device speech. Keys upgrade quality; they never unblock the app.

---

## What "personalised" actually means here

Personalisation is not cosmetic — three stored preference signals drive the brief:

| Preference | Effect |
|---|---|
| `niches` | which stories qualify |
| `briefMinutes` | how many make the cut |
| `voiceId` | who narrates |

Stories are **interleaved round-robin across the chosen niches**, so one busy topic can't crowd out the rest of the brief. The tune control in the brief header (⚙) opens a condensed version of onboarding screens 04/05 — change niches, voice or length and the running order rebuilds in place.

Switching a user from Technology to Finance visibly rebuilds the brief:

```
niches: markets, indian-biz, global | voice: meera | 15 min

01 [markets]     Sensex closes at record high as IT stocks rally.
02 [indian-biz]  Reliance splits retail arm ahead of expected listing.
03 [global]      Fed minutes hint at a September policy shift.
04 [markets]     Rupee steadies after RBI intervention in forward markets.
05 [indian-biz]  GST council moves to simplify rates into three slabs.
06 [global]      EU agrees framework for critical minerals partnership.
...
```

Playback position is persisted server-side, so closing the app and reopening it resumes mid-story.

---

## Deployment

| Piece | Host | Notes |
|---|---|---|
| Web app | Vercel | Expo web export, SPA rewrites, immutable asset caching |
| API + Postgres | Railway | `pnpm build` generates the Postgres client; `pnpm start` pushes the schema then boots |

The same codebase also runs natively — `pnpm start` in `mobile/` and press `i`/`a`, or scan the QR with Expo Go.

## Architecture

```
mobile/          Expo SDK 57 · React Native 0.86 · React 19 · Expo Router
  app/           login (02), brief (09), splash router
  components/    Glow, Logo, Screen, BriefHeader, NowPlaying
  lib/           theme tokens, typed API client, auth context, player hook

server/          Node · Express · TypeScript · Prisma · SQLite
  src/routes/    auth, me, brief, stories, tts
  src/services/  news (GNews), tts (ElevenLabs), brief (generation)
```

### API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | status + which integrations are live |
| `POST` | `/api/auth/google` | verify Google ID token, mint session JWT |
| `POST` | `/api/auth/demo` | guest sign-in for review without OAuth setup |
| `GET` | `/api/me` | profile + preferences |
| `PUT` | `/api/me/preferences` | update niches, voice, length, delivery time |
| `GET` | `/api/me/options` | niche / profession / voice catalogues |
| `GET` | `/api/brief/today` | today's personalised brief (`?refresh=true` rebuilds) |
| `POST` | `/api/brief/:id/progress` | persist playback position |
| `GET` | `/api/stories` | Discover feed, filterable by niche |
| `POST` | `/api/stories/:id/save` | toggle saved |
| `GET` | `/api/tts/story/:id` | narration audio, or a device-speech plan |

### Narration

`GET /api/tts/story/:id` returns one of two things:

- **`200 audio/mpeg`** — neural narration from ElevenLabs, cached to disk so repeat plays never burn quota.
- **`409 JSON`** — a `device-speech` plan (script + locale/pitch/rate) when no TTS key is set.

The client's `usePlayer` hook drives both behind one interface. Speech synthesis reports no playback position, so progress there runs off a synthetic ticker against the story's estimated duration; the audio engine reports its own.

This is why the app is always demoable: **the fallback is a designed path, not a failure mode.**

Audio URLs are handed to the platform player, which fetches them itself and cannot attach an `Authorization` header — impossible on web, where playback goes through an `<audio>` element. That route therefore also accepts the session token as a query parameter.

**On voice casting:** ElevenLabs gates most of its library behind a paid plan (*"Free users cannot use library voices via the API"*), and the free set contains a single female voice. Aria and Meera therefore share it, separated by delivery settings, and Kai uses a distinct male voice. Repointing `elevenLabsId` in `src/domain.ts` at the exact casting restores it on a paid key — nothing else changes.

---

## News sources

Headlines resolve through a three-step fallback, best first:

1. **GNews** — richer summaries and images. Needs a key; 100 requests/day free.
2. **Google News RSS** — no key, no account, no cap. Headline-level detail only, so stories carry no abstract; the card and the narration both adapt rather than echoing the title twice.
3. **Seeded pool** — 22 backdated stories, so a failed fetch still yields a brief.

Seeds are deliberately timestamped four days back, so any live headline outranks them.

## Optional keys

Copy `server/.env.example` → `server/.env` and fill in what you have. All three have free tiers and need no payment method.

| Key | Gets you | Without it |
|---|---|---|
| `GNEWS_API_KEY` | article summaries and images | live RSS headlines |
| `ELEVENLABS_API_KEY` | Aria / Kai / Meera voices | on-device speech |
| `GOOGLE_CLIENT_ID` | real Google sign-in | guest sign-in |

`GET /api/health` reports exactly which are active, including which news source is in use.

---

## Design fidelity

Tokens were extracted from the Figma rather than eyeballed — `mobile/lib/theme.ts` is the single source of truth.

| Token | Value |
|---|---|
| Ink | `#0D0D0D` |
| Violet → light | `#6A4CF7` → `#9080FF` |
| Green / cyan | `#3ECF8E` / `#38D9F0` |
| Text / muted | `#F0EDE8` / `#8A8480` |
| Surfaces | `rgba(255,255,255,.05–.07)`, hairline `.09–.12` |
| Display / UI / mono | Instrument Serif · Hanken Grotesk · Geist Mono |

React Native has no radial-gradient primitive, so the ambient glows are built from many thin concentric circles with a quadratic falloff (`components/Glow.tsx`).

---

## Scope

Built: login and the personalised news player, as asked, with the backend behind both.

Not built: onboarding steps 03–08, Discover (10), Settings (11), Billing (12). The backend already serves Discover and preferences, so those screens are UI work on top of live endpoints rather than new plumbing.
