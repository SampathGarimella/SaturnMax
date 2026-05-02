# Firebase setup - SaturnMax Technologies Pvt Ltd

This guide gets Firebase Auth + Firestore + Storage working end-to-end. The code is already wired — you just need to provide config and enable the services in the Firebase Console.

---

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it `saturn-max` (or anything).
2. Disable Google Analytics if you don't need it.

## 2. Register a Web app and grab the config

1. Project Overview → click the **Web (`</>`) icon** → register the app (nickname `saturn-max-web`).
2. Firebase shows a `firebaseConfig` object. Copy the 6 values into `/app/frontend/.env`:

```dotenv
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=saturn-max.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=saturn-max
REACT_APP_FIREBASE_STORAGE_BUCKET=saturn-max.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
REACT_APP_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

> These 6 keys are **safe to expose** in the built bundle — Firebase enforces security via rules, not secrecy.

Restart the frontend after pasting:
```bash
sudo supervisorctl restart frontend
```

## 3. Enable Authentication providers

Firebase Console → **Build → Authentication → Sign-in method**:

- **Email/Password** → toggle **Enable** → Save.
- **Google** → toggle **Enable** → pick a project-level support email → Save.
- **LinkedIn (optional)** — Firebase no longer has a native LinkedIn provider. If you need it, register a LinkedIn Developer app, then add it here as an **OpenID Connect** provider with provider id `oidc.linkedin`. (The code already calls `new OAuthProvider("oidc.linkedin")`.)

**Authorized domains** → add your GitHub Pages domain, your Emergent preview domain, and `localhost`:
- `localhost`
- `0f73298b-2489-40e1-b9bc-ca67edc62fc8.preview.emergentagent.com`
- `saturnmax.com` (once live)

## 4. Enable Firestore

Firebase Console → **Build → Firestore Database → Create database** → choose your region → start in **production mode**.

Paste these **security rules** under the **Rules** tab. This version supports
candidate, consultant, and employee portals. Employee users can manage operating
records; candidates and consultants can only read/write their own private areas.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function role() {
      return signedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        ? userDoc().data.role
        : null;
    }

    function isEmployee() {
      return role() == "employee" || role() == "admin";
    }

    function isConsultant() {
      return role() == "consultant";
    }

    function isCandidate() {
      return role() == "candidate";
    }

    // User profile and role document keyed by Firebase Auth uid.
    // Create the first employee/admin document manually from Firebase Console.
    match /users/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow create: if signedIn() && request.auth.uid == uid;
      allow update, delete: if isEmployee() || request.auth.uid == uid;
    }

    // Each user's private message thread
    match /messages/{uid}/thread/{messageId} {
      allow read, write: if signedIn() && (request.auth.uid == uid || isEmployee());
    }

    // Candidate profile docs keyed by uid
    match /candidates/{uid} {
      allow read, write: if signedIn() && (request.auth.uid == uid || isEmployee());
    }

    // Consultant profile, pay metadata, KYC/tax status, onboarding status
    match /consultants/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow create, update, delete: if isEmployee();
    }

    // Employee-managed application and lead queues
    match /applications/{applicationId} {
      allow create: if signedIn();
      allow read, update, delete: if isEmployee();
    }

    match /leads/{leadId} {
      allow create: if true;
      allow read, update, delete: if isEmployee();
    }

    // Client/project records created by employees
    match /projects/{projectId} {
      allow read, write: if isEmployee();
    }

    // Optional audit trail for role portal logins
    match /loginEvents/{eventId} {
      allow create: if signedIn();
      allow read, update, delete: if isEmployee();
    }

    // Deny everything else by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 5. Enable Storage

Firebase Console → **Build → Storage → Get started** → use the default bucket → production mode.

Paste these **storage rules**. Resumes and consultant documents can live fully in
Firebase Storage as long as the metadata and role assignments are protected in
Firestore.

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signedIn() {
      return request.auth != null;
    }

    function userDoc() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid));
    }

    function role() {
      return signedIn() && firestore.exists(/databases/(default)/documents/users/$(request.auth.uid))
        ? userDoc().data.role
        : null;
    }

    function isEmployee() {
      return role() == "employee" || role() == "admin";
    }

    // Candidate resumes: candidate owns their folder; employees can review.
    match /resumes/{uid}/{fileName} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow write: if signedIn() && (request.auth.uid == uid || isEmployee());
    }

    // Consultant India KYC, tax, onboarding, and client documents.
    match /consultant-documents/{uid}/{fileName} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow write: if isEmployee();
    }

    // Internal employee/admin files.
    match /employee-documents/{uid}/{fileName} {
      allow read, write: if signedIn() && (request.auth.uid == uid || isEmployee());
    }

    // Client/project documents should usually stay employee-only until you add
    // explicit project membership rules.
    match /project-documents/{projectId}/{fileName} {
      allow read, write: if isEmployee();
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## 6. Seed your first test user

Authentication → **Users → Add user**:
- Email: `rahul@email.com`
- Password: `Test1234!` (any 8+ char password)

Now sign in from `/login` with those credentials — you should land on the dashboard with real Firebase auth.

## 7. What lights up automatically

Once Firebase is configured:
- ✅ Login page Google button works (real popup)
- ✅ Email/password sign in + sign up
- ✅ Forgot password sends a real reset email
- ✅ `/dashboard/messages` becomes **real-time Firestore** (send & receive)
- ✅ `/dashboard/profile` resume upload writes to Firebase Storage with a progress bar
- ✅ `/consultant-login` and `/employee-login` can use Firebase Auth accounts
- ✅ Consultant resumes/KYC/tax documents can be stored under protected Storage folders
- ✅ `isFirebaseConfigured === true` — no more placeholder toasts

Until the config is set, the app keeps running in **demo mode** (localStorage session + seeded placeholder messages + upload preview) so previews never break.

## 8. Is a backend needed?

Firebase can store the normal app data:

- Auth users and roles: Firestore `users/{uid}`
- Candidates and resumes: Firestore `candidates/{uid}` + Storage `resumes/{uid}/...`
- Consultants: Firestore `consultants/{uid}` + Storage `consultant-documents/{uid}/...`
- Leads, applications, projects, and messages: Firestore collections

A backend is still recommended for trusted operations:

- Setting employee/admin custom claims
- Sending emails from a protected sender
- Resume parsing, virus scanning, and document verification
- Payroll, payouts, invoices, or tax forms
- Any integration that uses private API keys
- Scheduled reminders, audit logs, or signed document generation

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
| Still seeing placeholder toasts | You forgot to restart frontend after editing `.env` |
