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

export const APPLICATION_TERMINAL_STATUSES = Object.freeze(["not_shortlisted"]);

export const APPLICATION_STATUS_VALUES = Object.freeze([
  ...APPLICATION_STAGES,
  ...APPLICATION_TERMINAL_STATUSES,
]);

export const LEGACY_APPLICATION_STATUSES = Object.freeze({
  pending: "applied",
  under_review: "screening",
  offer: "offer_sent",
});

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

export const APPLICATION_STATUS_META = Object.freeze({
  applied: {
    label: APPLICATION_LABELS.applied,
    className: "bg-slate-100 text-slate-700",
    tone: "slate",
    nextAction: "SaturnMax Technologies Pvt Ltd will screen your profile.",
  },
  screening: {
    label: APPLICATION_LABELS.screening,
    className: "bg-amber-100 text-amber-800",
    tone: "amber",
    nextAction: "Keep your profile and resume ready for recruiter review.",
  },
  interview: {
    label: APPLICATION_LABELS.interview,
    className: "bg-emerald-100 text-emerald-800",
    tone: "green",
    nextAction: "Watch messages for interview scheduling and follow-up.",
  },
  selected: {
    label: APPLICATION_LABELS.selected,
    className: "bg-blue-100 text-blue-800",
    tone: "blue",
    nextAction: "The hiring team is preparing offer documentation.",
  },
  offer_sent: {
    label: APPLICATION_LABELS.offer_sent,
    className: "bg-blue-100 text-blue-800",
    tone: "blue",
    nextAction: "Download the offer letter, sign it, and upload the signed copy.",
  },
  offer_signed: {
    label: APPLICATION_LABELS.offer_signed,
    className: "bg-emerald-100 text-emerald-800",
    tone: "green",
    nextAction: "Complete onboarding documents shared by the operations team.",
  },
  onboarding: {
    label: APPLICATION_LABELS.onboarding,
    className: "bg-violet-100 text-violet-800",
    tone: "violet",
    nextAction: "Finish onboarding and India compliance review.",
  },
  consultant_active: {
    label: APPLICATION_LABELS.consultant_active,
    className: "bg-emerald-100 text-emerald-800",
    tone: "green",
    nextAction: "Use Consultant login for project, pay, and document updates.",
  },
  not_shortlisted: {
    label: APPLICATION_LABELS.not_shortlisted,
    className: "bg-rose-100 text-rose-800",
    tone: "red",
    nextAction: "Apply to another matching role when ready.",
  },
});

export const APPLICATION_TRANSITIONS = Object.freeze({
  applied: Object.freeze(["screening", "not_shortlisted"]),
  screening: Object.freeze(["interview", "not_shortlisted"]),
  interview: Object.freeze(["selected", "not_shortlisted"]),
  selected: Object.freeze(["offer_sent", "not_shortlisted"]),
  offer_sent: Object.freeze(["offer_signed", "not_shortlisted"]),
  offer_signed: Object.freeze(["onboarding", "not_shortlisted"]),
  onboarding: Object.freeze(["consultant_active", "not_shortlisted"]),
  consultant_active: Object.freeze([]),
  not_shortlisted: Object.freeze([]),
});

export const REVIEW_STATUSES = Object.freeze([
  "pending_review",
  "approved",
  "rejected",
  "needs_changes",
]);

export const REVIEW_LABELS = Object.freeze({
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  needs_changes: "Needs changes",
});

export const REVIEW_STATUS_META = Object.freeze({
  pending_review: { label: REVIEW_LABELS.pending_review, className: "bg-amber-50 text-amber-700" },
  approved: { label: REVIEW_LABELS.approved, className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: REVIEW_LABELS.rejected, className: "bg-rose-50 text-rose-700" },
  needs_changes: { label: REVIEW_LABELS.needs_changes, className: "bg-amber-50 text-amber-700" },
});

export const ONBOARDING_STATUSES = Object.freeze([
  "not_started",
  "in_progress",
  "under_review",
  "approved",
  "complete",
]);

export const ONBOARDING_LABELS = Object.freeze({
  not_started: "Not started",
  in_progress: "In progress",
  under_review: "Under review",
  approved: "Approved",
  complete: "Complete",
});

const APPROVED_STATUSES = new Set(["approved", "complete"]);
const REVIEWABLE_DOCUMENT_TYPES = Object.freeze({
  signed_offer: Object.freeze(["signed_offer"]),
  signed_onboarding: Object.freeze(["signed_onboarding", "signed_onboarding_document"]),
  onboarding_pack: Object.freeze(["onboarding_pack", "onboarding"]),
  form12bb: Object.freeze(["form12bb", "form_12bb"]),
  pan: Object.freeze(["pan", "pan_details", "pan_card"]),
  uan: Object.freeze(["uan", "uan_details", "epf", "epfo"]),
  bank_details: Object.freeze(["bank_details"]),
});

const GATE_LABELS = Object.freeze({
  signed_offer: "approved signed offer",
  signed_onboarding: "approved signed onboarding document",
  onboarding_pack: "approved onboarding pack",
  form12bb: "approved Form 12BB",
  pan: "approved PAN/tax details",
  uan: "approved UAN/EPF details",
  bank_details: "approved bank details",
});

export class WorkflowTransitionError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "WorkflowTransitionError";
    this.code = "WORKFLOW_TRANSITION_BLOCKED";
    this.details = details;
  }
}

export function isWorkflowTransitionError(error) {
  return error?.code === "WORKFLOW_TRANSITION_BLOCKED";
}

export function normalizeApplicationStatus(status) {
  const value = String(status || "applied").trim();
  return LEGACY_APPLICATION_STATUSES[value] || value;
}

export function isApplicationStatus(value) {
  return APPLICATION_STATUS_VALUES.includes(normalizeApplicationStatus(value));
}

export function getApplicationStatusMeta(status) {
  const normalized = normalizeApplicationStatus(status);
  return APPLICATION_STATUS_META[normalized] || {
    label: String(status || "Pending").replace(/_/g, " "),
    className: "bg-slate-100 text-slate-700",
    tone: "slate",
    nextAction: "Wait for the next hiring-team update.",
  };
}

export function getReviewStatusMeta(status) {
  return REVIEW_STATUS_META[status] || {
    label: String(status || "Pending review").replace(/_/g, " "),
    className: "bg-slate-100 text-slate-700",
  };
}

function relatedToApplication(item, applicationId, ownerUid) {
  if (!item) return false;
  if (applicationId && item.application_id && item.application_id !== applicationId) return false;
  if (ownerUid && item.owner_uid && item.owner_uid !== ownerUid) return false;
  return true;
}

function typeMatches(value, type) {
  const aliases = REVIEWABLE_DOCUMENT_TYPES[type] || [type];
  return aliases.includes(String(value || ""));
}

function hasApprovedDocument(items, type) {
  return items.some((item) => typeMatches(item.type, type) && APPROVED_STATUSES.has(item.status));
}

function hasApprovedReview(items, type) {
  return items.some((item) => typeMatches(item.type, type) && APPROVED_STATUSES.has(item.status));
}

function typeConfigured(items, type) {
  return items.some((item) => typeMatches(item.type, type));
}

export function getActivationChecklist(context = {}) {
  const application = context.application || {};
  const applicationId = context.applicationId || application.id || application.application_id || "";
  const ownerUid =
    context.candidateUid ||
    application.candidate_uid ||
    application.owner_uid ||
    application.uid ||
    "";
  const documents = (context.documents || []).filter((item) =>
    relatedToApplication(item, applicationId, ownerUid)
  );
  const reviews = (context.reviews || []).filter((item) =>
    relatedToApplication(item, applicationId, ownerUid)
  );
  const requiredDocumentTypes = context.requiredDocumentTypes || [
    "signed_offer",
    "signed_onboarding",
  ];
  const configuredComplianceTypes = ["onboarding_pack", "form12bb", "pan", "uan", "bank_details"].filter(
    (type) => typeConfigured(documents, type) || typeConfigured(reviews, type)
  );
  const requiredTypes = Array.from(
    new Set([
      ...requiredDocumentTypes,
      ...(context.requiredComplianceTypes || configuredComplianceTypes),
    ])
  );

  return requiredTypes.map((type) => ({
    type,
    label: GATE_LABELS[type] || type.replace(/_/g, " "),
    complete: hasApprovedDocument(documents, type) || hasApprovedReview(reviews, type),
  }));
}

export function validateActivationChecklist(context = {}) {
  const checklist = getActivationChecklist(context);
  const missing = checklist.filter((item) => !item.complete);
  if (missing.length === 0) {
    return { ok: true, checklist, missing: [] };
  }
  return {
    ok: false,
    checklist,
    missing,
    reason: `Missing ${missing.map((item) => item.label).join(", ")}.`,
    nextAction: "Approve the required signed and onboarding documents before activation.",
  };
}

export function validateApplicationTransition(from, to, context = {}) {
  const normalizedFrom = normalizeApplicationStatus(from);
  const normalizedTo = normalizeApplicationStatus(to);
  const fromMeta = getApplicationStatusMeta(normalizedFrom);
  const toMeta = getApplicationStatusMeta(normalizedTo);

  if (!isApplicationStatus(normalizedFrom) || !isApplicationStatus(normalizedTo)) {
    return {
      ok: false,
      from: normalizedFrom,
      to: normalizedTo,
      reason: "Unsupported application status.",
      nextAction: "Refresh the dashboard and use one of the configured lifecycle stages.",
    };
  }

  if (normalizedFrom === normalizedTo) {
    return { ok: true, from: normalizedFrom, to: normalizedTo, reason: "", nextAction: "" };
  }

  const allowed = APPLICATION_TRANSITIONS[normalizedFrom] || [];
  if (!allowed.includes(normalizedTo)) {
    const nextLabels = allowed.map((status) => APPLICATION_LABELS[status]).join(", ");
    return {
      ok: false,
      from: normalizedFrom,
      to: normalizedTo,
      reason: `Cannot move ${fromMeta.label} to ${toMeta.label}.`,
      nextAction: nextLabels
        ? `Move to ${nextLabels} first.`
        : `${fromMeta.label} is a terminal state.`,
    };
  }

  if (normalizedTo === "consultant_active") {
    const checklistResult = validateActivationChecklist({
      ...context,
      application: context.application || { status: normalizedFrom },
    });
    if (!checklistResult.ok) {
      return {
        ok: false,
        from: normalizedFrom,
        to: normalizedTo,
        reason: checklistResult.reason,
        nextAction: checklistResult.nextAction,
        checklist: checklistResult.checklist,
        missing: checklistResult.missing,
      };
    }
  }

  return { ok: true, from: normalizedFrom, to: normalizedTo, reason: "", nextAction: "" };
}

export function assertApplicationTransition(from, to, context = {}) {
  const result = validateApplicationTransition(from, to, context);
  if (!result.ok) {
    throw new WorkflowTransitionError(result.reason, result);
  }
  return result;
}

export function normalizeMessageData(id, data = {}, candidateUid = "") {
  const author = data.author || "candidate";
  const unreadForCandidate = Boolean(
    data.unreadForCandidate ?? (data.unread && author !== "candidate")
  );
  const unreadForEmployee = Boolean(
    data.unreadForEmployee ?? (data.unread && author === "candidate")
  );

  return {
    id,
    ...data,
    candidate_uid: data.candidate_uid || candidateUid,
    unreadForCandidate,
    unreadForEmployee,
  };
}

export function getMessageReadPatch(viewer, actorUid, timestamp) {
  if (viewer === "candidate") {
    return {
      unreadForCandidate: false,
      candidateReadAt: timestamp,
      updatedAt: timestamp,
      updatedBy: actorUid,
    };
  }
  if (viewer === "employee") {
    return {
      unreadForEmployee: false,
      employeeReadAt: timestamp,
      updatedAt: timestamp,
      updatedBy: actorUid,
    };
  }
  throw new Error("Unknown message viewer.");
}
