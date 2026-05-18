# Company — Product Requirements Document

## Original problem statement
> "implement home page, implement Candidate login page, implement candidate dashboard page and push. make it interactive if i miss anything add it to link page to page link it and i will add firebase for all login and all and let me know how to setup emails and setup everything for dashboard and all."

## Architecture

| Layer | Tech |
|---|---|
| Frontend | React 19 + React Router 7 + Tailwind 3.4 + Lucide + Sonner + axios + **Firebase SDK 12** |
| Backend | FastAPI + Motor (MongoDB async) + Resend (graceful fallback) |
| Auth | **Firebase Auth** (email/password, Google, LinkedIn OIDC) with localStorage fallback for demo |
| Messaging | **Firestore** real-time `messages/{uid}/thread/{messageId}` |
| Resume storage | **Firebase Storage** `resumes/{uid}/resume.pdf` with progress UI |
| Email | Resend with graceful fallback (key blank → log warning, skip send) |

## User personas
- **Candidate** — browses jobs, applies, tracks status, chats with HR, uploads resume.
- **HR / Hiring team** (`info@example.com`) — receives applications + contact emails, replies via Firestore messages.
- **US client** — reaches out via contact form.

## What's been implemented

### 2026-04-24 · Iteration 1 — MVP
- FastAPI backend with 5 jobs, demo candidate, 4 applications, 5 activity rows seeded on startup.
- Endpoints: `/api/health`, `/api/jobs`, `/api/jobs/{id}`, `POST /api/applications`, `GET /api/applications`, `POST /api/contact`, `GET /api/contact`, `/api/candidates/{email}`, `/api/dashboard/{email}`.
- Resend email integration with graceful fallback (fire-and-forget `asyncio.create_task`, `asyncio.to_thread` wrapping the sync SDK).
- React Home page: hero, services grid, open positions from backend, application form wired, contact form wired, how-it-works, footer CTA.
- Candidate login (UI-only placeholder at this stage).
- Candidate dashboard with live data from backend: sidebar, stats, applications, activity, profile checklist.
- Dashboard sub-pages: Browse jobs, My applications, Messages (preview), My profile, Settings.
- Lint + pytest (12/12) + Playwright E2E all green.

### 2026-04-24 · Iteration 2 — Firebase wiring + content edits + git safety
- **`.gitignore`** added at repo root (never commit `.env`, `node_modules/`, `__pycache__/`, logs).
- **`backend/.env.example`** and **`frontend/.env.example`** committed as safe templates.
- **Firebase SDK** (`firebase@^12`) installed.
- **`src/lib/firebase.js`** — bootstraps Firebase from `REACT_APP_FIREBASE_*` env vars with an `isFirebaseConfigured` boolean so the app never crashes when config is missing.
- **`src/context/AuthContext.js`** — `AuthProvider` that unifies Firebase Auth + demo mode under a single `useAuth()` hook. Provides `signIn`, `signUp`, `signInWithGoogle`, `signInWithLinkedIn` (custom OIDC `oidc.linkedin`), `sendReset`, `signOut`, `enterDemo`, plus `mode` = `"firebase" | "demo" | "guest"`.
- **`LoginPage.js`** — real Firebase Auth when configured; falls back to an info toast + amber "Firebase not configured yet" banner when not. Google + LinkedIn buttons trigger `signInWithPopup`. Forgot password sends a real reset email.
- **`DashboardLayout.js`** — uses `useAuth()`, shows `Demo` / `Live` pills next to user name, handles real Firebase users with empty dashboards (404 → empty shell).
- **`Messages.js`** — real-time Firestore messaging (`onSnapshot` subscribe + `addDoc` send with `serverTimestamp`). Falls back to seeded preview + read-only composer when not signed in with Firebase.
- **`MyProfile.js`** — Firebase Storage resume upload with live progress bar (`uploadBytesResumable` → `getDownloadURL`). 5MB limit, PDF/DOC/DOCX. Disabled with a clear hint in demo mode.
- **Home page content edits**:
  - Removed "Trusted by teams at" block and sample brands
  - Removed "Est. 2024" badge; replaced with "US–India IT consulting & contract staffing"
  - Metrics strip → `3x / 48hr / 10+ Projects delivered / 20+ Consultants placed with clients`
  - Hero subtitle updated to highlight "vetted consultants on contract"
  - Services grid reordered with new flagship "Consultants on contract" card (replaces Cybersecurity)
  - Candidate login button promoted to a bordered CTA in the header
- **`FIREBASE_SETUP.md`** — complete 8-step walkthrough including Firestore + Storage security rules ready to paste.
- **`EMAIL_SETUP.md`** — Resend setup guide from iteration 1.

## Backlog

### P0
- Add real `REACT_APP_FIREBASE_*` config + `RESEND_API_KEY` to respective `.env` files (pending user).
- Verify Firebase Console: Auth providers enabled, Firestore rules pasted, Storage rules pasted, authorized domains set.
- Final domain confirmed as `example.com`; keep product copy, contact emails, and Firebase authorized domains aligned to it.

### P1
- Persist profile edits (name/phone/portfolio) to Firestore under `candidates/{uid}` once Firebase is live.
- HR admin view to manage applications and send Firestore messages.
- Real "applied X ago" computed from `created_at`.
- "Thanks for applying" confirmation email to the candidate (not just HR).

### P2
- Job detail pages (`/jobs/:slug`) with SEO metadata.
- Real analytics on profile views.
- Rate-limit the application/contact endpoints.
