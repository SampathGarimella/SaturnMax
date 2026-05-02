# Deploying SaturnMax Technologies Pvt Ltd to GitHub Pages

This repo ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds the React app on every push to `main` and publishes it to GitHub Pages. Your `saturnmax.com` domain keeps working via the `CNAME` file inside `frontend/public/`.

---

## Why your site went blank

Before this fix the repo had a leftover `index.html` (the "We're Building Something Great" page) at the root, and GitHub Pages was serving *that* — not the React app under `frontend/`. The fix:

- Deleted `index.html`, `script.js`, `styles.css`, `feature-flags.js` from the repo root
- Moved `CNAME` into `frontend/public/CNAME` (so it ends up in the built bundle)
- Added a GitHub Actions workflow that runs `yarn build` and deploys `frontend/build/` to Pages
- Added `frontend/public/404.html` + a matching snippet in `index.html` so deep links like `/login` and `/dashboard` don't 404 on GitHub Pages (GH Pages is static and doesn't understand React Router routes without this trick)

---

## One-time GitHub setup (≈ 3 minutes)

### 1. Push the repo
Click **Save to Github** in the Emergent chat composer (or `git push` locally). The Actions workflow will try to run — that's fine if it fails the first time, you'll fix settings in the next steps.

### 2. Enable Pages to use Actions
Repo → **Settings → Pages** → under **Build and deployment → Source**, pick **GitHub Actions** (not "Deploy from a branch"). Save.

### 2a. Attach the production domain
In the same **Settings → Pages** screen, set **Custom domain** to:

```text
saturnmax.com
```

GitHub should verify that the deployed artifact contains `CNAME`; this repo
ships it from `frontend/public/CNAME`, so every React build publishes it.
After the DNS check passes, enable **Enforce HTTPS**.

### 3. Add your build-time secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret name | Value | Required? |
|---|---|---|
| `REACT_APP_BACKEND_URL` | Your backend URL, e.g. `https://0f73298b-2489-40e1-b9bc-ca67edc62fc8.preview.emergentagent.com` (Emergent preview while iterating) or your Railway/Render URL | **Yes** — else API calls will fail |
| `REACT_APP_FIREBASE_API_KEY` | From Firebase Console → Web app config | Only when wiring Firebase |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Only when wiring Firebase |
| `REACT_APP_FIREBASE_PROJECT_ID` | `your-project-id` | Only when wiring Firebase |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | Only when wiring Firebase |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Numeric | Only when wiring Firebase |
| `REACT_APP_FIREBASE_APP_ID` | `1:xxx:web:yyy` | Only when wiring Firebase |

> Firebase web config is safe to expose publicly — security comes from Firestore/Storage rules. We still inject via secrets so the repo stays tidy.

### 4. Re-run the workflow
Repo → **Actions → Deploy frontend to GitHub Pages → Run workflow**. It should go green in ~2 minutes. The last step prints the deployed URL (should be `https://saturnmax.com`).

### 5. Verify DNS (if you see "domain not configured")
If you just set up `saturnmax.com`, make sure your DNS has either:
- 4 A records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- or a CNAME record `www` → `<your-github-username>.github.io`

DNS changes can take up to 24 hours, but are usually live in minutes.

---

## The backend is separate

GitHub Pages **only serves the React frontend**. The FastAPI backend (`/app/backend/`) needs a different host:

- **Quickest** — Deploy the backend via Emergent (click **Deploy** in the Emergent app). Copy its URL and paste as `REACT_APP_BACKEND_URL` secret, re-run the Action.
- **Free tiers** — Railway / Render / Fly.io all take a `Dockerfile` or plain Python repo.
- **Firebase-only** — Drop the FastAPI backend entirely; move application/contact/dashboard data to Firestore + Cloud Functions for emails.

Until the backend is reachable from saturnmax.com, the home page application form, contact form, and dashboard data will show "Couldn't load…" errors. Everything else (hero, services, careers list when `REACT_APP_BACKEND_URL` is unset, login page, dashboard UI in demo mode) still renders perfectly.

---

## Local re-build for testing

```bash
cd frontend
yarn install
yarn build
npx serve -s build    # open http://localhost:3000
```

---

## Common issues

| Symptom | Fix |
|---|---|
| Site still blank after push | Check **Actions** tab — look for a failed run. Usually a missing secret or Pages source not set to "GitHub Actions". |
| 404 on /login or /dashboard | Ensure `frontend/public/404.html` exists — it should redirect back to `/` and let React Router handle it. |
| `saturnmax.com` shows GitHub's default page | `CNAME` file missing from build — should live at `frontend/public/CNAME` with exactly `saturnmax.com` inside. |
| API calls fail with CORS | Backend's `CORS_ORIGINS` in `backend/.env` must include `https://saturnmax.com`. |
| Firebase sign-in says "unauthorized domain" | Firebase Console → Authentication → Settings → Authorized domains → add `saturnmax.com`. |

## Current product roadmap

The public site now supports the first version of the sales and hiring funnel:

- Services funnel: AI automation, dedicated squads, cloud optimization, data engineering, contract consultants, and fractional CTO.
- Lead capture: company, budget, timeline, subject, and message fields on the contact form.
- Careers funnel: public job cards, application form, and candidate dashboard.
- Credibility assets: delivery promises, case-study style proof points, and US/India operating model copy.
- Dashboard roadmap: candidate status today, with visible placeholders for client workspace and admin command queue.
