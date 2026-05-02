# Firebase setup - SaturnMax Technologies Pvt Ltd

This guide gets Firebase Auth + Firestore + Storage working end-to-end. The code is already wired — you just need to provide config and enable the services in the Firebase Console.

---

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it `saturn-max` (or anything).
2. Disable Google Analytics if you don't need it.

## 2. Register a Web app and grab the config

1. Project Overview → click the **Web (`</>`) icon** → register the app (nickname `saturn-max-web`).
2. Firebase shows a `firebaseConfig` object. Copy the values into `frontend/.env` for local testing and into GitHub repository secrets for the Pages build:

```dotenv
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=saturn-max.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=saturn-max
REACT_APP_FIREBASE_STORAGE_BUCKET=saturn-max.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
REACT_APP_FIREBASE_APP_ID=1:1234567890:web:abcdef
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

> These web app keys are **safe to expose** in the built bundle — Firebase enforces security via rules, not secrecy.

Restart the frontend after pasting:
```bash
cd frontend
yarn start
```

## 3. Enable Authentication providers

Firebase Console → **Build → Authentication → Sign-in method**:

- **Email/Password** → toggle **Enable** → Save.
- **Google** → toggle **Enable** → pick a project-level support email → Save.
- **LinkedIn (optional)** — Firebase no longer has a native LinkedIn provider. If you need it, register a LinkedIn Developer app, then add it here as an **OpenID Connect** provider with provider id `oidc.linkedin`. (The code already calls `new OAuthProvider("oidc.linkedin")`.)

**Authorized domains** → add your production domain and `localhost`:
- `localhost`
- `saturnmax.com` (once live)

## 4. Enable Firestore

Firebase Console → **Build → Firestore Database → Create database** → choose your region → start in **production mode**.

The committed source of truth is `firestore.rules`. Paste that full file into
Firebase Console → Firestore Database → Rules, or deploy it with Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

These rules enforce role-based access from `users/{uid}.role`, preserve existing
role documents, restrict candidate/consultant ownership, and allow public reads
only for published jobs.

## 5. Enable Storage

Firebase Console → **Build → Storage → Get started** → use the default bucket → production mode.

The committed source of truth is `storage.rules`. Paste that full file into
Firebase Console → Storage → Rules, or deploy it with Firebase CLI:

```bash
firebase deploy --only storage
```

These rules protect resumes, offer letters, signed offers, onboarding documents,
consultant documents, and payroll documents by owner UID plus employee/admin
role checks.

## 6. Seed your test users

Authentication → **Users → Add user**:

```txt
admin.test@saturnmaxtech.com       role: admin
employee.test@saturnmaxtech.com    role: employee
candidate.test@saturnmaxtech.com   role: candidate
consultant.test@saturnmaxtech.com  role: consultant
```

For each Auth user, copy the Firebase UID and create Firestore document
`users/{uid}` with:

```txt
role: string
email: string
name: string
status: active
createdAt: timestamp
```

Candidate sign-up creates `candidate` role documents automatically. Employee,
admin, and consultant role documents are created manually until you add a
trusted backend or Cloud Function for privileged account creation.

## 7. What lights up automatically

Once Firebase is configured:
- ✅ Login page Google button works (real popup)
- ✅ Email/password sign in + sign up
- ✅ Forgot password sends a real reset email
- ✅ Employees can post, publish, pause, close, and delete jobs
- ✅ Candidates can apply to published jobs and track lifecycle status
- ✅ `/dashboard/messages` becomes **real-time Firestore** (send & receive)
- ✅ Employee dashboard can receive and reply to candidate message threads
- ✅ `/dashboard/profile` resume upload writes to Firebase Storage
- ✅ Employees can send offer letters and onboarding documents
- ✅ Candidates can upload signed offer/onboarding documents
- ✅ `/consultant-login` and `/employee-login` can use Firebase Auth accounts
- ✅ Consultants can view project/pay/documents and submit bank details for review

## 8. Is a backend needed?

Firebase can store the normal app data:

- Auth users and roles: Firestore `users/{uid}`
- Candidates and resumes: Firestore `candidates/{uid}` + Storage `resumes/{uid}/...`
- Consultants: Firestore `consultants/{uid}` + Storage `consultant-documents/{uid}/...`
- Jobs, leads, applications, onboarding, documents, reviews, and messages

A backend is still recommended for trusted operations:

- Creating employee/admin/consultant Auth accounts from inside the app
- Sending emails from a protected sender
- Resume parsing, virus scanning, and document verification
- Payroll, payouts, invoices, or tax forms
- Any integration that uses private API keys
- Scheduled reminders, audit logs, or signed document generation

The historical `backend/` service is deprecated and is not part of the active
production architecture. Use Firebase Security Rules now and Firebase Cloud
Functions later for privileged server-side work.

## 9. Sending yourself a test message (real-time)

1. Sign in as your test user.
2. Open `/dashboard/messages` → type in the composer → send.
3. Open the page in another tab — the new message appears live via Firestore `onSnapshot`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `auth/unauthorized-domain` | Add your domain to Authentication → **Settings → Authorized domains** |
| Google popup blocked | Unblock popups for the site |
| `storage/unauthorized` | You forgot to paste the storage rules in step 5 |
| Firestore `permission-denied` | You forgot the Firestore rules in step 4 |
| Firebase service unavailable | You forgot to add Firebase GitHub Actions secrets or re-run the deploy workflow |
