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
  [ROLES.EMPLOYEE]: "/employee-dashboard/applications",
  [ROLES.ADMIN]: "/employee-dashboard/applications",
});

export const ROLE_PORTAL_ROOT = Object.freeze({
  [ROLES.CANDIDATE]: "/dashboard",
  [ROLES.CONSULTANT]: "/consultant-dashboard",
  [ROLES.EMPLOYEE]: "/employee-dashboard",
  [ROLES.ADMIN]: "/employee-dashboard",
});

export const ROLE_PORTAL_NAME = Object.freeze({
  [ROLES.ADMIN]: "Employee Portal",
  [ROLES.EMPLOYEE]: "Employee Portal",
  [ROLES.CONSULTANT]: "Consultant Portal",
  [ROLES.CANDIDATE]: "Candidate Portal",
});

export const ROLE_PORTAL_LABEL = Object.freeze({
  [ROLES.ADMIN]: "Employee login",
  [ROLES.EMPLOYEE]: "Employee login",
  [ROLES.CONSULTANT]: "Consultant login",
  [ROLES.CANDIDATE]: "Candidate login",
});

export { APPLICATION_LABELS, APPLICATION_STAGES } from "./workflow";

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
