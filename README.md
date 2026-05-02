# SaturnMax Technologies Pvt Ltd

Production-focused web platform for:
- candidate hiring
- consultant operations
- employee operations
- client lead intake

## Stack
- Frontend: React + CRACO + Tailwind
- Backend: FastAPI + MongoDB
- Auth/Storage: Firebase (recommended for production identity and file storage)
- Deploy: GitHub Pages (frontend) + separate backend host

## Local Run
1. Frontend
```bash
cd frontend
yarn install
yarn start
```

2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --port 8000
```

## Production Environment

Use:
- [frontend/.env.example](/Users/sampath1/Documents/Github/SaturnMax/frontend/.env.example)
- [backend/.env.example](/Users/sampath1/Documents/Github/SaturnMax/backend/.env.example)

Critical backend values:
- `CORS_ORIGINS`
- `ALLOWED_HOSTS`
- `ADMIN_API_KEY`
- `MONGO_URL`
- `DB_NAME`

## Security Baseline Included
- Trusted host enforcement (`ALLOWED_HOSTS`)
- CORS allowlist
- security response headers
- request id header + request logging
- in-memory rate limiting for contact/application submissions
- admin-key protected list endpoints:
  - `GET /api/contact`
  - `GET /api/applications` (without `email` filter)
- server-side validation for:
  - Indian phone format
  - CTC LPA numeric format
  - resume/portfolio URL protocol

## Role Model

Firestore user role is expected at:
- `users/{uid}.role` with one of:
  - `candidate`
  - `consultant`
  - `employee`
  - `admin`

Frontend route access is role-protected:
- Candidate portal: `/dashboard`
- Consultant portal: `/consultant-dashboard`
- Employee/admin portal: `/employee-dashboard`

## CI

GitHub Actions CI runs on push/PR:
- frontend install + build
- backend dependency install + syntax check

See:
- [.github/workflows/ci.yml](/Users/sampath1/Documents/Github/SaturnMax/.github/workflows/ci.yml)

## Production Next Steps (Recommended)
1. Verify Firebase role assignment automation (Cloud Functions or admin tool).
2. Add backend auth verification for Firebase ID tokens (API-level authorization).
3. Add managed file scanning for uploaded resumes/documents.
4. Move rate limiting from memory to Redis or API gateway policy.
5. Add end-to-end tests for role access and application lifecycle.
