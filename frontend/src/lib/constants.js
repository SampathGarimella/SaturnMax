export const ROLES = Object.freeze({
  CANDIDATE: "candidate",
  CONSULTANT: "consultant",
  EMPLOYEE: "employee",
  ADMIN: "admin",
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

export const ROLE_STATUS = Object.freeze({
  LOADING: "loading",
  READY: "ready",
  UNKNOWN: "unknown",
  ERROR: "error",
  GUEST: "guest",
});

export const ROLE_HOME = Object.freeze({
  [ROLES.CANDIDATE]: "/dashboard",
  [ROLES.CONSULTANT]: "/consultant-dashboard",
  [ROLES.EMPLOYEE]: "/employee-dashboard",
  [ROLES.ADMIN]: "/employee-dashboard",
});

export const ROLE_PORTAL_LABEL = Object.freeze({
  [ROLES.ADMIN]: "Employee login",
  [ROLES.EMPLOYEE]: "Employee login",
  [ROLES.CONSULTANT]: "Consultant login",
  [ROLES.CANDIDATE]: "Candidate login",
});

export const APPLICATION_STAGES = Object.freeze([
  "applied",
  "screening",
  "interview",
  "selected",
  "offer_sent",
  "offer_signed",
  "onboarding",
  "consultant_active",
]);

export const APPLICATION_LABELS = Object.freeze({
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  selected: "Selected",
  offer_sent: "Offer sent",
  offer_signed: "Offer signed",
  onboarding: "Onboarding",
  consultant_active: "Consultant active",
  not_shortlisted: "Not shortlisted",
});

export const JOB_STATUSES = Object.freeze(["draft", "published", "paused", "closed"]);

export const COLLECTIONS = Object.freeze({
  USERS: "users",
  JOBS: "jobs",
  APPLICATIONS: "applications",
  CANDIDATES: "candidates",
  CONSULTANTS: "consultants",
  ONBOARDING: "onboarding",
  DOCUMENTS: "documents",
  REVIEWS: "reviews",
  MESSAGES: "messages",
  LEADS: "leads",
  LOGIN_EVENTS: "loginEvents",
});
