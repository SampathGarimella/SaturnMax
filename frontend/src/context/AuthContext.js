import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { ensureCandidateUser } from "../lib/api";
import { ROLE_STATUS } from "../lib/constants";
import { resolveRoleDocument } from "../lib/validators";

const AuthContext = createContext(null);

function mapFirebaseUser(fbUser, role) {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
    photoURL: fbUser.photoURL,
    emailVerified: Boolean(fbUser.emailVerified),
    role,
  };
}

const AUTH_UNAVAILABLE =
  "Sign in is temporarily unavailable. Please contact SaturnMax Technologies support.";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {email, name, uid?, photoURL?}
  const [mode, setMode] = useState("guest"); // firebase | guest
  const [loading, setLoading] = useState(true);
  const [roleStatus, setRoleStatus] = useState(ROLE_STATUS.LOADING);
  const [roleError, setRoleError] = useState("");

  const loadRoleForUid = useCallback(async (uid) => {
    if (!db || !uid) {
      return {
        role: null,
        status: ROLE_STATUS.ERROR,
        message: "Role service is unavailable.",
      };
    }
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) {
        return {
          role: null,
          status: ROLE_STATUS.UNKNOWN,
          message: "Your account role is not configured yet.",
        };
      }
      return resolveRoleDocument(snap.data() || {});
    } catch (err) {
      console.warn("Could not load user role from Firestore:", err);
      return {
        role: null,
        status: ROLE_STATUS.ERROR,
        message: "Could not verify your account role. Please retry.",
      };
    }
  }, []);

  const applyRoleResult = useCallback((fbUser, result) => {
    const nextUser = mapFirebaseUser(fbUser, result.role);
    nextUser.roleStatus = result.status;
    nextUser.roleError = result.message || "";
    setUser(nextUser);
    setRoleStatus(result.status);
    setRoleError(result.message || "");
    setMode("firebase");
    return nextUser;
  }, []);

  // Bootstrap authentication state.
  useEffect(() => {
    let unsub = null;

    if (isFirebaseConfigured && auth) {
      unsub = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          setRoleStatus(ROLE_STATUS.LOADING);
          const result = await loadRoleForUid(fbUser.uid);
          applyRoleResult(fbUser, result);
        } else {
          setUser(null);
          setMode("guest");
          setRoleStatus(ROLE_STATUS.GUEST);
          setRoleError("");
        }
        setLoading(false);
      });
    } else {
      setUser(null);
      setMode("guest");
      setRoleStatus(ROLE_STATUS.GUEST);
      setRoleError("");
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [applyRoleResult, loadRoleForUid]);

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
        throw new Error(AUTH_UNAVAILABLE);
      }
      await applyPersistence(keepSignedIn);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setRoleStatus(ROLE_STATUS.LOADING);
      const result = await loadRoleForUid(cred.user.uid);
      return applyRoleResult(cred.user, result);
    },
    [applyPersistence, applyRoleResult, loadRoleForUid]
  );

  const signUp = useCallback(
    async ({ email, password, name, keepSignedIn }) => {
      if (!isFirebaseConfigured || !auth) {
        throw new Error(AUTH_UNAVAILABLE);
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
      await ensureCandidateUser({ ...cred.user, name });
      try {
        await sendEmailVerification(cred.user, {
          url: "https://saturnmax.com/dashboard",
          handleCodeInApp: false,
        });
      } catch (e) {
        console.warn("sendEmailVerification failed:", e);
      }
      const result = await loadRoleForUid(cred.user.uid);
      return applyRoleResult(cred.user, result);
    },
    [applyPersistence, applyRoleResult, loadRoleForUid]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(AUTH_UNAVAILABLE);
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    await ensureCandidateUser(cred.user);
    const result = await loadRoleForUid(cred.user.uid);
    return applyRoleResult(cred.user, result);
  }, [applyRoleResult, loadRoleForUid]);

  const signInWithLinkedIn = useCallback(async () => {
    // LinkedIn isn't a native Firebase provider. If you've registered LinkedIn
    // as a custom OIDC provider in your Firebase project (with id
    // "oidc.linkedin"), this will work. Otherwise we throw a clear error.
    if (!isFirebaseConfigured || !auth) {
      throw new Error(AUTH_UNAVAILABLE);
    }
    const provider = new OAuthProvider("oidc.linkedin");
    provider.addScope("openid");
    provider.addScope("profile");
    provider.addScope("email");
    const cred = await signInWithPopup(auth, provider);
    await ensureCandidateUser(cred.user);
    const result = await loadRoleForUid(cred.user.uid);
    return applyRoleResult(cred.user, result);
  }, [applyRoleResult, loadRoleForUid]);

  const sendReset = useCallback(async (email) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(AUTH_UNAVAILABLE);
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
    setUser(null);
    setMode("guest");
    setRoleStatus(ROLE_STATUS.GUEST);
    setRoleError("");
  }, []);

  const value = {
    user,
    loading,
    mode,
    roleStatus,
    roleLoading: roleStatus === ROLE_STATUS.LOADING,
    roleError,
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
