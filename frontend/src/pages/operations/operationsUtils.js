import { validateActivationChecklist } from "../../lib/workflow";

export function textIncludes(item, query, fields) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) =>
    String(item?.[field] || "")
      .toLowerCase()
      .includes(q)
  );
}

export function tsValue(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value.seconds) return value.seconds * 1000;
  if (value.toMillis) return value.toMillis();
  return new Date(value).getTime() || 0;
}

export function sortRecent(items, field = "updatedAt") {
  return [...items].sort((a, b) => tsValue(b[field] || b.updated_at) - tsValue(a[field] || a.updated_at));
}

export function applicationNeedsCandidateAction(application) {
  return ["offer_sent", "offer_signed"].includes(application.status);
}

export function applicationBlockedActivation(application, documents, reviews) {
  if (application.status !== "onboarding") return false;
  return !validateActivationChecklist({ application, documents, reviews }).ok;
}

export function humanDate(value) {
  const millis = tsValue(value);
  if (!millis) return "recently";
  return new Date(millis).toLocaleString();
}

export function compactName(value, fallback = "Unknown") {
  return String(value || fallback).trim() || fallback;
}
