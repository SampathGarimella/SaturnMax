import { ROLE_STATUS, ROLE_VALUES, ROLES } from "./constants";

const INDIA_MOBILE_RE = /^(?:\+91[-\s]?|0)?[6-9]\d{9}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_RE = /^\d{9,18}$/;

export function isCanonicalRole(role) {
  return ROLE_VALUES.includes(role);
}

export function resolveRoleDocument(data) {
  if (!data || !data.role) {
    return {
      role: null,
      status: ROLE_STATUS.UNKNOWN,
      message: "Your account role is not configured yet.",
    };
  }

  if (!isCanonicalRole(data.role)) {
    return {
      role: null,
      status: ROLE_STATUS.UNKNOWN,
      message: "Your account role is not recognized.",
    };
  }

  return {
    role: data.role,
    status: ROLE_STATUS.READY,
    message: "",
  };
}

export function buildSafeCandidateUserData(existingData = null, nextData = {}) {
  const existing = existingData || {};
  const email = nextData.email || existing.email || "";
  const fallbackName = email ? email.split("@")[0] : "Candidate";

  return {
    role: existing.role || ROLES.CANDIDATE,
    email,
    name: nextData.name || existing.name || fallbackName,
    status: existing.status || "active",
  };
}

export function canUseCandidateWorkflow(role) {
  return role === ROLES.CANDIDATE;
}

export function isValidIndianMobile(value) {
  return INDIA_MOBILE_RE.test(String(value || "").trim());
}

export function isValidIfsc(value) {
  return IFSC_RE.test(String(value || "").trim().toUpperCase());
}

export function isValidAccountNumber(value) {
  return ACCOUNT_NUMBER_RE.test(String(value || "").trim());
}
