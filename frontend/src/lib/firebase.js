// Firebase bootstrap with a graceful production fallback.
// The app must never crash if Firebase env vars are missing; feature screens
// show service-unavailable states until deployment config is present.
//
// Paste your web-app config into frontend/.env as:
//   REACT_APP_FIREBASE_API_KEY=...
//   REACT_APP_FIREBASE_AUTH_DOMAIN=...
//   REACT_APP_FIREBASE_PROJECT_ID=...
//   REACT_APP_FIREBASE_STORAGE_BUCKET=...
//   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
//   REACT_APP_FIREBASE_APP_ID=...
//   REACT_APP_FIREBASE_MEASUREMENT_ID=... (optional)
// Then restart the local frontend or rebuild for deployment.

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

let app = null;
let auth = null;
let db = null;
let functions = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    app = getApps()[0] || initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app, process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || "us-central1");
    storage = getStorage(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Firebase init failed:", err);
  }
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "Firebase config not provided. Auth / Firestore / Storage are unavailable. " +
      "Add REACT_APP_FIREBASE_* env vars and restart the frontend to enable."
  );
}

export { app, auth, db, functions, storage };
