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

    match /users/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow create: if signedIn()
        && request.auth.uid == uid
        && request.resource.data.role == "candidate";
      allow update: if isEmployee()
        || (signedIn()
          && request.auth.uid == uid
          && request.resource.data.role == resource.data.role);
      allow delete: if isEmployee();
    }

    match /messages/{uid}/thread/{messageId} {
      allow read, write: if signedIn() && (request.auth.uid == uid || isEmployee());
    }

    match /candidates/{uid} {
      allow read, write: if signedIn() && (request.auth.uid == uid || isEmployee());
    }

    match /consultants/{uid} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow create, update, delete: if isEmployee();
      allow update: if signedIn()
        && request.auth.uid == uid
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(["bankDetails", "bankStatus", "updatedAt"]);
    }

    match /jobs/{jobId} {
      allow read: if resource.data.status == "published" || isEmployee();
      allow create, update, delete: if isEmployee();
    }

    match /applications/{applicationId} {
      allow create: if signedIn()
        && request.resource.data.candidate_uid == request.auth.uid;
      allow read: if isEmployee()
        || (signedIn() && resource.data.candidate_uid == request.auth.uid);
      allow update: if isEmployee()
        || (signedIn()
          && resource.data.candidate_uid == request.auth.uid
          && request.resource.data.candidate_uid == resource.data.candidate_uid
          && request.resource.data.status in ["offer_signed", "onboarding"]);
      allow delete: if isEmployee();
    }

    match /leads/{leadId} {
      allow create: if true;
      allow read, update, delete: if isEmployee();
    }

    match /onboarding/{applicationId} {
      allow read: if isEmployee()
        || (signedIn() && resource.data.candidate_uid == request.auth.uid);
      allow create, update, delete: if isEmployee();
    }

    match /documents/{documentId} {
      allow read: if isEmployee()
        || (signedIn() && resource.data.owner_uid == request.auth.uid);
      allow create: if isEmployee()
        || (signedIn() && request.resource.data.owner_uid == request.auth.uid);
      allow update, delete: if isEmployee();
    }

    match /reviews/{reviewId} {
      allow read: if isEmployee()
        || (signedIn() && resource.data.owner_uid == request.auth.uid);
      allow create: if isEmployee()
        || (signedIn() && request.resource.data.owner_uid == request.auth.uid);
      allow update, delete: if isEmployee();
    }

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

    match /resumes/{uid}/{fileName} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow write: if signedIn() && (request.auth.uid == uid || isEmployee());
    }

    match /offer-letters/{uid}/{applicationId}/{fileName} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow write: if isEmployee();
    }

    match /signed-offers/{uid}/{applicationId}/{fileName} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow write: if signedIn() && request.auth.uid == uid;
    }

    match /onboarding-documents/{uid}/{applicationId}/{fileName} {
      allow read, write: if signedIn() && (request.auth.uid == uid || isEmployee());
    }

    match /consultant-documents/{uid}/{fileName} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow write: if isEmployee();
    }

    match /payroll-documents/{uid}/{yearMonth}/{fileName} {
      allow read: if signedIn() && (request.auth.uid == uid || isEmployee());
      allow write: if isEmployee();
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

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
