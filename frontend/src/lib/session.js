// Lightweight demo-session helper. Replace with Firebase later.
const KEY = "saturnmax:session";
const EVENTS_KEY = "saturnmax:login-events";

export const DEMO_PROFILES = {
  candidate: {
    role: "candidate",
    email: "rahul@email.com",
    name: "Rahul Sharma",
    title: "Job Candidate",
  },
  consultant: {
    role: "consultant",
    email: "ananya.consultant@saturnmaxtech.com",
    name: "Ananya Rao",
    title: "Senior Cloud Consultant",
  },
  employee: {
    role: "employee",
    email: "priya.employee@saturnmaxtech.com",
    name: "Priya Menon",
    title: "People Operations Lead",
  },
};

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

export function recordLogin(session) {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const events = raw ? JSON.parse(raw) : [];
    const next = [
      {
        id: `${Date.now()}-${session.email}`,
        name: session.name,
        email: session.email,
        role: session.role || "candidate",
        title: session.title || "",
        mode: session.mode || "demo",
        timestamp: new Date().toISOString(),
      },
      ...events,
    ].slice(0, 20);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures in private browsing.
  }
}

export function getLoginEvents() {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Used to prefill the demo experience (recruiter/mockup persona).
export const DEMO_EMAIL = DEMO_PROFILES.candidate.email;
