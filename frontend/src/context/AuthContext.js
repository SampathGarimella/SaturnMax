import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import {
  clearSession,
} from "../lib/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {email, name, uid?, photoURL?}
  const [mode, setMode] = useState("guest"); // firebase | guest
  const [loading, setLoading] = useState(true);

  const loadRoleForUid = useCallback(async (uid) => {
    if (!db || !uid) return "candidate";
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) return "candidate";
      const data = snap.data() || {};
      return data.role || "candidate";
    } catch (err) {
      console.warn("Could not load user role from Firestore:", err);
      return "candidate";
    }
  }, []);

  // Bootstrap authentication state.
  useEffect(() => {
    let unsub = null;

    if (isFirebaseConfigured && auth) {
      unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const role = await loadRoleForUid(fbUser.uid);
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "Candidate",
            photoURL: fbUser.photoURL,
            role,
          });
          setMode("firebase");
        } else {
          setUser(null);
          setMode("guest");
        }
        setLoading(false);
      });
    } else {
      setUser(null);
      setMode("guest");
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [loadRoleForUid]);

  const applyPersistence = useCallback(async (keepSignedIn) => {
    if (!isFirebaseConfigured || !auth) return;
    try {
      await setPersistence(
        auth,
        keepSignedIn ? browserLocalPersistence : browserSessionPersistence
      );
    } catch (e) {
      // non-fatal
      console.warn("setPersistence failed:", e);
    }
  }, []);

  const signIn = useCallback(
    async ({ email, password, keepSignedIn }) => {
      if (!isFirebaseConfigured || !auth) {
        throw new Error(
          "Firebase isn't configured yet. Add your REACT_APP_FIREBASE_* env vars to /app/frontend/.env and restart the frontend."
        );
      }
      await applyPersistence(keepSignedIn);
      await signInWithEmailAndPassword(auth, email, password);
    },
    [applyPersistence]
  );

  const signUp = useCallback(
    async ({ email, password, name, keepSignedIn }) => {
      if (!isFirebaseConfigured || !auth) {
        throw new Error(
          "Firebase isn't configured yet. Add your REACT_APP_FIREBASE_* env vars to /app/frontend/.env and restart the frontend."
        );
      }
      await applyPersistence(keepSignedIn);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        try {
          await updateProfile(cred.user, { displayName: name });
        } catch (e) {
          // non-fatal
          console.warn("updateProfile failed:", e);
        }
      }
    },
    [applyPersistence]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(
        "Firebase isn't configured yet. Add your REACT_APP_FIREBASE_* env vars to /app/frontend/.env and restart the frontend."
      );
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  }, []);

  const signInWithLinkedIn = useCallback(async () => {
    // LinkedIn isn't a native Firebase provider. If you've registered LinkedIn
    // as a custom OIDC provider in your Firebase project (with id
    // "oidc.linkedin"), this will work. Otherwise we throw a clear error.
    if (!isFirebaseConfigured || !auth) {
      throw new Error(
        "Firebase isn't configured yet. Add your REACT_APP_FIREBASE_* env vars and restart the frontend."
      );
    }
    const provider = new OAuthProvider("oidc.linkedin");
    provider.addScope("openid");
    provider.addScope("profile");
    provider.addScope("email");
    await signInWithPopup(auth, provider);
  }, []);

  const sendReset = useCallback(async (email) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(
        "Firebase isn't configured yet. Add your REACT_APP_FIREBASE_* env vars and restart the frontend."
      );
    }
    await sendPasswordResetEmail(auth, email);
  }, []);

  const signOut = useCallback(async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn("Firebase signOut failed:", e);
      }
    }
    clearSession();
    setUser(null);
    setMode("guest");
  }, []);

  const value = {
    user,
    loading,
    mode,
    isFirebaseConfigured,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithLinkedIn,
    sendReset,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
