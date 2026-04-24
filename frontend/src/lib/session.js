// Lightweight demo-session helper. Replace with Firebase later.
const KEY = "saturnmax:session";

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

// Used to prefill the demo experience (recruiter/mockup persona).
export const DEMO_EMAIL = "rahul@email.com";
