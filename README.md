# SaturnMax

Firebase-first web platform for:
- candidate hiring
- consultant onboarding
- employee operations
- admin account management
- client lead intake

## Stack

- Frontend: React + CRACO + Tailwind
- Backend services: Firebase Auth, Firestore, Storage, and Cloud Functions
- Hosting: GitHub Pages for the React app
- Production domain: `saturnmax.com`

The older `backend/` FastAPI/Mongo service is deprecated and kept only as historical reference. New product work should use Firebase or Cloud Functions.

## Local Run

```bash
cd frontend
yarn install
yarn start
```

## Firebase Deploy

After changing rules or callable functions:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:submitLead,functions:manageLead,functions:manageJob,functions:updateHiringWorkflow,functions:resolveReviewDecision,functions:sendPortalPasswordSetup,functions:convertCandidateToConsultant,functions:createManualConsultantInvite,functions:adminUpsertPortalUser,functions:adminDeactivatePortalUser,firestore:rules,firestore:indexes,storage
```

## Role Model

Firestore user role is expected at `users/{uid}.role`:
- `candidate`
- `consultant`
- `employee`
- `admin`

Route access:
- Candidate portal: `/dashboard`
- Consultant portal: `/consultant-dashboard`
- Employee operations portal: `/employee-dashboard`
- Admin portal: `/admin-dashboard`

## Safety Baseline

- Firestore rules enforce role and ownership checks.
- Storage rules enforce owner/employee access plus file type and size limits.
- Candidate applications require verified Firebase email.
- Account creation, deactivation, and candidate-to-consultant conversion use Cloud Functions.
- Important records are archived or deactivated instead of hard deleted.

## CI

GitHub Actions runs:
- frontend unit tests
- frontend build
- Firestore rules emulator tests

See [.github/workflows/ci.yml](/Users/sampath1/Documents/Github/SaturnMax/.github/workflows/ci.yml).

## Production Next Steps

1. Deploy the latest functions and Firestore/Storage rules after each security change.
2. Configure Firebase Authentication email templates with neutral set/reset password wording.
3. Add email provider Cloud Functions later for application confirmations and status notifications.
4. Add malware scanning or manual review policy for uploaded resumes/documents before broad production use.
