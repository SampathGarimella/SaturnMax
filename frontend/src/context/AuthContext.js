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
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { getSession, setSession, clearSession, DEMO_EMAIL } from "../lib/session";

const AuthContext = createContext(null);

/**
 * Auth provider covering both real Firebase Auth (when configured) AND the
 * localStorage demo session (when not). Consumers always get a consistent API:
 *
 *   const { user, loading, mode, signIn, signUp, signInWithGoogle, signInWithLinkedIn,
 *           sendReset, signOut, enterDemo } = useAuth();
 *
 *   mode is "firebase" | "demo" | "guest"
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {email, name, uid?, photoURL?}
  const [mode, setMode] = useState("guest"); // firebase | demo | guest
  const [loading, setLoading] = useState(true);

  // Bootstrap: prefer Firebase onAuthStateChanged; fall back to localStorage session.
  useEffect(() => {
    let unsub = null;

    if (isFirebaseConfigured && auth) {
      unsub = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "Candidate",
            photoURL: fbUser.photoURL,
          });
          setMode("firebase");
        } else {
          // No Firebase user — check demo session for the dashboard preview.
          const demo = getSession();
          if (demo?.email) {
            setUser({ email: demo.email, name: demo.name || "Candidate" });
            setMode("demo");
          } else {
            setUser(null);
            setMode("guest");
          }
        }
        setLoading(false);
      });
    } else {
      // Firebase not configured at all → demo-only mode
      const demo = getSession();
      if (demo?.email) {
        setUser({ email: demo.email, name: demo.name || "Candidate" });
        setMode("demo");
      } else {
        setUser(null);
        setMode("guest");
      }
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

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

  // Preview-mode entry so reviewers can see the dashboard without real auth.
  const enterDemo = useCallback(() => {
    const session = { email: DEMO_EMAIL, name: "Rahul Sharma" };
    setSession(session);
    setUser({ email: session.email, name: session.name });
    setMode("demo");
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
    enterDemo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
