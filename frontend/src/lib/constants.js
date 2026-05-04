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
  [ROLES.EMPLOYEE]: "/employee-dashboard/hiring/candidates",
  [ROLES.ADMIN]: "/admin-dashboard",
});

export const ROLE_PORTAL_ROOT = Object.freeze({
  [ROLES.CANDIDATE]: "/dashboard",
  [ROLES.CONSULTANT]: "/consultant-dashboard",
  [ROLES.EMPLOYEE]: "/employee-dashboard",
  [ROLES.ADMIN]: "/admin-dashboard",
});

export const ROLE_PORTAL_NAME = Object.freeze({
  [ROLES.ADMIN]: "Admin Portal",
  [ROLES.EMPLOYEE]: "Employee Portal",
  [ROLES.CONSULTANT]: "Consultant Portal",
  [ROLES.CANDIDATE]: "Candidate Portal",
});

export const ROLE_PORTAL_LABEL = Object.freeze({
  [ROLES.ADMIN]: "Employee/Admin Login",
  [ROLES.EMPLOYEE]: "Employee/Admin Login",
  [ROLES.CONSULTANT]: "Consultant Login",
  [ROLES.CANDIDATE]: "Candidate Login",
});

export { APPLICATION_LABELS, APPLICATION_STAGES } from "./workflow";

export const JOB_STATUSES = Object.freeze(["draft", "published", "paused", "closed", "archived"]);

export const LEAD_STATUSES = Object.freeze([
  "new",
  "contacted",
  "qualified",
  "not_relevant",
  "converted",
]);

export const LEAD_STATUS_LABELS = Object.freeze({
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  not_relevant: "Not Relevant",
  converted: "Converted",
});

export const PUBLIC_APPLICATION_STATUS_LABELS = Object.freeze({
  applied: "Submitted",
  screening: "Under Review",
  interview: "Interview",
  selected: "Offer",
  offer_sent: "Offer",
  offer_signed: "Offer",
  onboarding: "Converted",
  consultant_active: "Converted",
  not_shortlisted: "Not Selected",
});

export const PERMISSION_MATRIX = Object.freeze([
  {
    role: "Candidate",
    canDo: "Sign up, verify email, create profile, upload resume, apply to jobs, track public status, message hiring team, submit requested documents, manage own settings.",
    cannotDo: "Read internal reviews, edit roles, view pay/bank data, create consultants, manage jobs, or access employee/admin queues.",
  },
  {
    role: "Consultant",
    canDo: "View assigned consultant profile, project snapshot, onboarding checklist, documents, review outcomes, submit bank/compliance updates for approval, and contact HR/operations.",
    cannotDo: "Edit pay, client/project assignment, approval status, bank approval, PAN/UAN approval, roles, users, jobs, or internal hiring reviews.",
  },
  {
    role: "Employee",
    canDo: "Manage hiring operations, jobs, candidates, applications, messages, leads, reviews, consultant profiles, document requests, and candidate conversion workflows.",
    cannotDo: "Perform system-level role administration, deactivate accounts, or edit sensitive pay/bank/tax fields unless admin/HR permissions are granted.",
  },
  {
    role: "Admin",
    canDo: "Manage accounts, roles, password setup emails, deactivation, jobs, consultant records, activity history, sensitive fields, and system operations.",
    cannotDo: "Bypass audit history or expose private candidate/consultant data publicly.",
  },
]);

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
  CONSULTANT_EMAIL_INDEX: "consultantEmailIndex",
  ACTIVITY_LOGS: "activityLogs",
});
