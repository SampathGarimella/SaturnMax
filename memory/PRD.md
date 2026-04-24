# Saturn Max Technologies — Product Requirements Document

## Original problem statement
> "implement home page, implement Candidate login page, implement candidate dashboard page and push. make it interactive if i miss anything add it to link page to page link it and i will add firebase for all login and all and let me know how to setup emails and setup everything for dashboard and all."

## User-selected build choices
1. **Full-stack** — FastAPI + MongoDB (not static)
2. **Login UI only** — Google/LinkedIn + email/password are placeholders, ready for Firebase wiring
3. **Real data** — dashboard pulls applications the candidate actually submitted
4. **Persist contact messages** — every "Send us a message" saved to MongoDB for review
5. **Real emails** — Resend provider, recipient `careers@saturnmaxtech.com`, key blank on day one (documented graceful fallback)

## Architecture

| Layer | Tech |
|------|------|
| Frontend | React 19 + React Router 7 + Tailwind CSS 3.4 + Lucide icons + Sonner toasts + axios |
| Backend  | FastAPI + Motor (MongoDB async) + Resend SDK |
| Database | MongoDB collections: `jobs`, `applications`, `candidates`, `activities`, `contact_messages` |
| Email    | Resend (graceful fallback when `RESEND_API_KEY` blank) |

## User personas
- **Candidate (Rahul Sharma persona)** — browses jobs, applies, tracks application status, reads messages, completes profile.
- **Hiring team (careers@saturnmaxtech.com)** — receives application + contact emails, reads stored submissions.
- **US client lead** — reaches out through contact form.

## Core requirements (static)
- Home page: hero, services grid, open positions, application form, how-it-works steps, contact form, footer CTA.
- Candidate login page: sign in / create account tabs, Google & LinkedIn OAuth placeholder buttons, email+password form, forgot password link, keep-me-signed-in toggle.
- Candidate dashboard: sidebar nav, 4 stat cards, My applications, Recent activity, Complete your profile, sub-pages for Browse jobs / My applications / Messages / My profile / Settings.

## What's been implemented (2026-04-24)
- ✅ FastAPI backend with seed-on-startup (5 jobs, demo candidate, 4 applications, 5 activity rows)
- ✅ Endpoints: `/api/health`, `/api/jobs`, `/api/jobs/{id}`, `POST /api/applications`, `GET /api/applications`, `POST /api/contact`, `GET /api/contact`, `/api/candidates/{email}`, `/api/dashboard/{email}`
- ✅ Resend integration with `asyncio.to_thread` + fire-and-forget + graceful fallback
- ✅ React Home page matching the mockup (hero, 6 services, 5 live job rows, application form wired, contact form wired, how-it-works, footer CTA)
- ✅ Candidate login (Sign in / Create account tabs, Google + LinkedIn OAuth placeholders, email form placeholder, "Enter demo" CTA that seeds session)
- ✅ Candidate dashboard with live data: sidebar, greeting, 4 stat cards, applications list, activity feed, profile checklist
- ✅ Dashboard sub-pages: Browse jobs, My applications, Messages, My profile, Settings
- ✅ Linting green (ruff + eslint) · testing subagent: 12/12 backend + full Playwright E2E passed with zero console errors
- ✅ `/app/EMAIL_SETUP.md` — Resend setup guide
- ✅ `/app/memory/test_credentials.md` — demo candidate documented

## Backlog / prioritized next steps

### P0 (blocking full "real" experience)
- Wire **Firebase Auth** (email/password + Google + LinkedIn). Replace placeholders in `LoginPage.js`. Replace localStorage session helper with Firebase user context.
- Add `RESEND_API_KEY` to `/app/backend/.env` and verify `saturnmaxtech.com` domain in Resend.

### P1 (polish + activation)
- Persist profile edits from `/dashboard/profile` (currently read-only).
- Real messaging: Firestore thread per candidate ↔ HR team (`/dashboard/messages` is preview).
- File upload for resumes on the profile page → S3/Firebase Storage.
- Application status updates (admin view to move `pending → under_review → interview → offer/not_shortlisted`).
- Real "applied_ago" computed from `created_at` on dashboard render.

### P2 (nice to have)
- Admin dashboard for HR to browse all applications + contacts.
- Job detail pages (`/jobs/:slug`) with SEO metadata.
- Analytics on profile views (currently hardcoded 18/+5).
- Email templates for candidate-facing confirmations.

## Enhancement idea
> **Why don't you add an "application success" email back to the candidate?** Right now HR gets notified but the candidate just sees a toast. Sending a branded "thanks for applying — here's what happens next" email doubles your perceived professionalism and cuts the "did my application go through?" support questions. The pipeline is already in place — just add a second `send_email_async` call targeting `payload.email` inside `POST /api/applications`.
