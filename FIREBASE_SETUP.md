# Firebase setup — Saturn Max Technologies

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

Paste these **security rules** under the **Rules** tab:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Each candidate's private message thread
    match /messages/{uid}/thread/{messageId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Optional: candidate profile docs keyed by uid
    match /candidates/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
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

Paste these **storage rules**:

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Resumes: only the signed-in user can read/write their own file
    match /resumes/{uid}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
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
- ✅ `isFirebaseConfigured === true` — no more placeholder toasts

Until the config is set, the app keeps running in **demo mode** (localStorage session + seeded placeholder messages + upload preview) so previews never break.

## 8. Sending yourself a test message (real-time)

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
