const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

const CONSULTANT_TYPES = new Set(["Contract", "Full-time", "Bench", "Client-assigned"]);
const ROLES = new Set(["candidate", "consultant", "employee", "admin"]);
const APPROVED_HIRING_STAGES = new Set([
  "approved",
  "converted_to_consultant",
  "credentials_sent",
]);
const JOB_STATUSES = new Set(["draft", "published", "paused", "closed", "archived"]);
const LEAD_STATUSES = new Set(["new", "contacted", "qualified", "not_relevant", "converted"]);
const REVIEW_STATUSES = new Set(["pending_review", "approved", "rejected", "needs_changes"]);
const APPLICATION_STATUSES = new Set([
  "applied",
  "screening",
  "interview",
  "selected",
  "offer_sent",
  "offer_signed",
  "onboarding",
  "consultant_active",
  "not_shortlisted",
]);
const APPLICATION_TRANSITIONS = {
  applied: new Set(["screening", "not_shortlisted"]),
  screening: new Set(["interview", "not_shortlisted"]),
  interview: new Set(["selected", "not_shortlisted"]),
  selected: new Set(["offer_sent", "not_shortlisted"]),
  offer_sent: new Set(["offer_signed", "not_shortlisted"]),
  offer_signed: new Set(["onboarding", "not_shortlisted"]),
  onboarding: new Set(["consultant_active", "not_shortlisted"]),
  consultant_active: new Set([]),
  not_shortlisted: new Set([]),
};
const HIRING_WORKFLOW_STAGES = [
  "applied",
  "resume_review",
  "screening",
  "technical_interview",
  "client_interview",
  "hr_contract_review",
  "approved",
  "converted_to_consultant",
  "credentials_sent",
];
const HIRING_STAGE_TO_APPLICATION_STATUS = {
  applied: "applied",
  resume_review: "screening",
  screening: "screening",
  technical_interview: "interview",
  client_interview: "interview",
  hr_contract_review: "interview",
  approved: "selected",
  converted_to_consultant: "consultant_active",
  credentials_sent: "consultant_active",
};
const APPLICATION_STATUS_TO_HIRING_STAGE = {
  applied: "applied",
  screening: "screening",
  interview: "technical_interview",
  selected: "approved",
  offer_sent: "hr_contract_review",
  offer_signed: "hr_contract_review",
  onboarding: "hr_contract_review",
  consultant_active: "converted_to_consultant",
  not_shortlisted: "applied",
};
const HIRING_STAGE_INDEX = HIRING_WORKFLOW_STAGES.reduce((acc, stage, index) => {
  acc[stage] = index;
  return acc;
}, {});
const REVIEW_DOCUMENT_TYPES = {
  signed_offer: ["signed_offer"],
  signed_onboarding: ["signed_onboarding", "signed_onboarding_document"],
  onboarding_pack: ["signed_onboarding", "signed_onboarding_document", "onboarding_pack", "onboarding"],
  onboarding: ["signed_onboarding", "signed_onboarding_document", "onboarding_pack", "onboarding"],
  form12bb: ["form12bb", "form_12bb"],
  pan: ["pan", "pan_details", "pan_card"],
  uan: ["uan", "uan_details", "epf", "epfo"],
  bank_details: [],
};
const REVIEW_TASK_BY_TYPE = {
  signed_offer: "signed_offer",
  signed_onboarding: "onboarding",
  onboarding_pack: "onboarding",
  onboarding: "onboarding",
  form12bb: "form12bb",
  pan: "pan",
  uan: "uan",
  bank_details: "bank",
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function requireString(data, key, label) {
  const value = String(data?.[key] || "").trim();
  if (!value) {
    throw new HttpsError("invalid-argument", `${label} is required.`);
  }
  return value;
}

function splitTags(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function cleanString(value, maxLength = 2000) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeStatus(value, allowed, fallback) {
  const status = cleanString(value, 80);
  return allowed.has(status) ? status : fallback;
}

function consultantId(uid = "") {
  const suffix = String(uid)
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase();
  return `SMC-${suffix || "NEW001"}`;
}

async function assertEmployee(uid) {
  const snap = await db.collection("users").doc(uid).get();
  const role = snap.exists ? snap.data().role : "";
  if (!["employee", "admin"].includes(role)) {
    throw new HttpsError("permission-denied", "Only employee/admin users can invite consultants.");
  }
  return { role, email: snap.data()?.email || "" };
}

async function assertAdmin(uid) {
  const snap = await db.collection("users").doc(uid).get();
  const role = snap.exists ? snap.data().role : "";
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can manage portal users.");
  }
  return { role, email: snap.data()?.email || "" };
}

async function getOrCreateAuthUser({ email, name }) {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    return { user: existing, created: false };
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }

  const created = await admin.auth().createUser({
    email,
    displayName: name,
    emailVerified: false,
    disabled: false,
  });
  return { user: created, created: true };
}

async function findAuthUserByEmail(email) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (err) {
    if (err.code === "auth/user-not-found") return null;
    throw err;
  }
}

async function getOrCreateAuthUserForAccount({ uid, email, name, status }) {
  const disabled = ["inactive", "disabled"].includes(String(status || "").toLowerCase());
  if (!uid) return getOrCreateAuthUser({ email, name });

  try {
    const existing = await admin.auth().getUser(uid);
    const sameEmail = normalizeEmail(existing.email) === email;
    if (!sameEmail) {
      const emailOwner = await findAuthUserByEmail(email);
      if (emailOwner && emailOwner.uid !== uid) {
        throw new HttpsError("already-exists", "That email belongs to another Firebase Auth user.");
      }
    }
    const updated = await admin.auth().updateUser(uid, {
      email,
      displayName: name,
      disabled,
    });
    return { user: updated, created: false };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if (err.code !== "auth/user-not-found") throw err;
  }

  const emailOwner = await findAuthUserByEmail(email);
  if (emailOwner && emailOwner.uid !== uid) {
    throw new HttpsError("already-exists", "That email belongs to another Firebase Auth user.");
  }

  const created = await admin.auth().createUser({
    uid,
    email,
    displayName: name,
    emailVerified: false,
    disabled,
  });
  return { user: created, created: true };
}

function approvedForConversion(application = {}, candidate = {}) {
  return application.candidateApprovalStatus === "approved"
    || candidate.candidateApprovalStatus === "approved"
    || APPROVED_HIRING_STAGES.has(application.workflowStage)
    || APPROVED_HIRING_STAGES.has(candidate.workflowStage)
    || application.status === "approved";
}

function normalizeApplicationStatus(status) {
  const value = cleanString(status, 80) || "applied";
  if (value === "pending") return "applied";
  if (value === "under_review") return "screening";
  if (value === "offer") return "offer_sent";
  return APPLICATION_STATUSES.has(value) ? value : "applied";
}

function normalizeHiringStage(stage, fallbackStatus = "applied") {
  const value = cleanString(stage, 80);
  if (HIRING_WORKFLOW_STAGES.includes(value)) return value;
  return APPLICATION_STATUS_TO_HIRING_STAGE[normalizeApplicationStatus(fallbackStatus)] || "applied";
}

function nextHiringStage(stage) {
  const normalized = normalizeHiringStage(stage);
  return HIRING_WORKFLOW_STAGES[HIRING_STAGE_INDEX[normalized] + 1] || "";
}

function validateHiringTransition(from, to, allowJump = false) {
  const normalizedFrom = normalizeHiringStage(from);
  const normalizedTo = normalizeHiringStage(to);
  if (normalizedFrom === normalizedTo || allowJump) return { from: normalizedFrom, to: normalizedTo };
  if (HIRING_STAGE_INDEX[normalizedTo] !== HIRING_STAGE_INDEX[normalizedFrom] + 1) {
    throw new HttpsError("failed-precondition", `Move to ${nextHiringStage(normalizedFrom) || "the next configured stage"} first.`);
  }
  return { from: normalizedFrom, to: normalizedTo };
}

function validateApplicationTransition(from, to) {
  const normalizedFrom = normalizeApplicationStatus(from);
  const normalizedTo = normalizeApplicationStatus(to);
  if (normalizedTo === "consultant_active") {
    throw new HttpsError("failed-precondition", "Use candidate conversion to activate a consultant.");
  }
  if (normalizedFrom === normalizedTo) return { from: normalizedFrom, to: normalizedTo };
  const allowed = APPLICATION_TRANSITIONS[normalizedFrom] || new Set();
  if (!allowed.has(normalizedTo)) {
    throw new HttpsError("failed-precondition", `Cannot move ${normalizedFrom} to ${normalizedTo}.`);
  }
  return { from: normalizedFrom, to: normalizedTo };
}

function reviewDocumentStatus(status) {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "needs_changes") return "needs_changes";
  return "pending_review";
}

function reviewTaskStatus(status) {
  if (status === "approved") return "approved";
  if (status === "rejected" || status === "needs_changes") return "needs_changes";
  return "pending";
}

function typeMatches(value, aliases = []) {
  return aliases.includes(String(value || ""));
}

exports.createManualConsultantInvite = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }

  const actor = await assertEmployee(request.auth.uid);
  const data = request.data || {};
  const name = requireString(data, "fullName", "Full name");
  const email = normalizeEmail(requireString(data, "email", "Email"));
  const phone = requireString(data, "phone", "Phone");
  const roleTitle = requireString(data, "roleTitle", "Role title");
  const consultantType = requireString(data, "consultantType", "Consultant type");
  const startDate = requireString(data, "startDate", "Start date");
  const workLocation = requireString(data, "workLocation", "Work location");

  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid consultant email.");
  }
  if (!CONSULTANT_TYPES.has(consultantType)) {
    throw new HttpsError("invalid-argument", "Choose a supported consultant type.");
  }

  const existingIndex = await db.collection("consultantEmailIndex").doc(email).get();
  if (existingIndex.exists) {
    throw new HttpsError("already-exists", "A consultant with this email already exists.");
  }

  const { user, created } = await getOrCreateAuthUser({ email, name });
  const uid = user.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const consultantRef = db.collection("consultants").doc(uid);
  const emailIndexRef = db.collection("consultantEmailIndex").doc(email);
  const userRef = db.collection("users").doc(uid);
  const activityRef = db.collection("activityLogs").doc();

  await db.runTransaction(async (transaction) => {
    const [consultantSnap, emailIndexSnap] = await Promise.all([
      transaction.get(consultantRef),
      transaction.get(emailIndexRef),
    ]);

    if (consultantSnap.exists) {
      throw new HttpsError("already-exists", "A consultant record already exists for this account.");
    }
    if (emailIndexSnap.exists && emailIndexSnap.data()?.uid !== uid) {
      throw new HttpsError("already-exists", "A consultant with this email already exists.");
    }

    const consultant = {
      uid,
      authUid: uid,
      email,
      name,
      phone,
      consultantId: data.consultantId || consultantId(uid),
      consultantType,
      sourceCandidateId: "",
      sourceApplicationId: "",
      roleTitle,
      role: roleTitle,
      clientName: data.clientName || "",
      client: data.clientName || "",
      project: data.clientName || "",
      startDate,
      workLocation,
      rate: actor.role === "admin" ? data.rate || "" : "",
      monthlyPay: actor.role === "admin" ? data.rate || "" : "",
      skills: splitTags(data.skills),
      notes: data.notes || "",
      loginEnabled: true,
      loginSetupRequired: false,
      authUserCreated: created,
      credentialsStatus: "invite_pending_send",
      status: "Active consultant",
      bankStatus: "pending_review",
      panStatus: "pending_review",
      uanStatus: "pending_review",
      gstStatus: "not_required",
      createdByEmployeeId: request.auth.uid,
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    };

    transaction.set(consultantRef, consultant);
    transaction.set(userRef, {
      role: "consultant",
      email,
      name,
      status: "active",
      createdAt: now,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(emailIndexRef, {
      email,
      uid,
      consultantId: uid,
      source: "manual_consultant_invite",
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(activityRef, {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: "manual_consultant_invited",
      outcome: "success",
      targetCollection: "consultants",
      targetId: uid,
      after: { email, authUserCreated: created },
      createdAt: now,
    });
  });

  return {
    uid,
    email,
    name,
    authUserCreated: created,
    passwordEmailRequired: true,
  };
});

exports.submitLead = onCall({ region: "us-central1" }, async (request) => {
  const data = request.data || {};
  const name = requireString(data, "name", "Name");
  const email = normalizeEmail(requireString(data, "email", "Email"));
  const message = requireString(data, "message", "Message");
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid email.");
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  const leadRef = db.collection("leads").doc();
  await leadRef.set({
    id: leadRef.id,
    name: cleanString(name, 120),
    email,
    company: cleanString(data.company, 160),
    subject: cleanString(data.subject || "Website enquiry", 200),
    budget_range: cleanString(data.budget_range, 80),
    timeline: cleanString(data.timeline, 80),
    message: cleanString(message, 3000),
    status: "new",
    leadStatus: "new",
    source: "website",
    consent: data.consent !== false,
    createdAt: now,
    updatedAt: now,
  });
  return { id: leadRef.id };
});

exports.manageLead = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }
  const actor = await assertEmployee(request.auth.uid);
  const data = request.data || {};
  const leadId = requireString(data, "leadId", "Lead ID");
  const status = normalizeStatus(data.status || data.leadStatus, LEAD_STATUSES, "new");
  const now = admin.firestore.FieldValue.serverTimestamp();
  const leadRef = db.collection("leads").doc(leadId);
  const leadSnap = await leadRef.get();
  if (!leadSnap.exists) throw new HttpsError("not-found", "Lead was not found.");
  await db.runTransaction(async (transaction) => {
    transaction.set(leadRef, {
      status,
      leadStatus: status,
      assignedEmployeeId: cleanString(data.assignedEmployeeId, 160),
      notes: cleanString(data.notes, 3000),
      lastContactedAt: data.lastContactedAt || null,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: "lead_status_updated",
      outcome: "success",
      targetCollection: "leads",
      targetId: leadId,
      after: { status, assignedEmployeeId: cleanString(data.assignedEmployeeId, 160) },
      createdAt: now,
    });
  });
  return { id: leadId, status };
});

exports.manageJob = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }
  const actor = await assertEmployee(request.auth.uid);
  const data = request.data || {};
  const action = cleanString(data.action || "upsert", 40);
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (action === "upsert") {
    const payload = data.job || {};
    const title = requireString(payload, "title", "Job title");
    const description = requireString(payload, "description", "Job description");
    const status = normalizeStatus(payload.status, JOB_STATUSES, "draft");
    const jobRef = payload.id ? db.collection("jobs").doc(payload.id) : db.collection("jobs").doc();
    const jobDoc = {
      id: jobRef.id,
      title: cleanString(title, 180),
      department: cleanString(payload.department || "Engineering", 120),
      employment_type: cleanString(payload.employment_type || "Full-time", 80),
      work_mode: cleanString(payload.work_mode || "Remote", 80),
      owner: cleanString(payload.owner, 160),
      clientName: cleanString(payload.clientName, 160),
      priority: cleanString(payload.priority || "Medium", 80),
      hiringType: cleanString(payload.hiringType || payload.employment_type || "Full-time", 80),
      location: cleanString(payload.location || payload.work_mode || "Remote", 120),
      experience: cleanString(payload.experience || "0-3 yrs exp", 120),
      tags: splitTags(payload.tags),
      description: cleanString(description, 6000),
      status,
      updatedAt: now,
      updatedBy: request.auth.uid,
    };
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(jobRef);
      transaction.set(jobRef, {
        ...jobDoc,
        ...(snap.exists ? {} : { createdAt: now, createdBy: request.auth.uid }),
      }, { merge: true });
      transaction.set(db.collection("activityLogs").doc(), {
        actorUid: request.auth.uid,
        actorEmail: actor.email || request.auth.token.email || "",
        action: snap.exists ? "job_updated" : "job_created",
        outcome: "success",
        targetCollection: "jobs",
        targetId: jobRef.id,
        after: { status, title: jobDoc.title },
        createdAt: now,
      });
    });
    return { id: jobRef.id, ...jobDoc };
  }

  const jobId = requireString(data, "jobId", "Job ID");
  const jobRef = db.collection("jobs").doc(jobId);
  const snap = await jobRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Job was not found.");
  const nextStatus = action === "archive" ? "archived" : normalizeStatus(data.status, JOB_STATUSES, "draft");
  await db.runTransaction(async (transaction) => {
    transaction.set(jobRef, {
      status: nextStatus,
      ...(nextStatus === "archived" ? { archivedAt: now, archivedBy: request.auth.uid } : {}),
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: nextStatus === "archived" ? "job_archived" : "job_status_updated",
      outcome: "success",
      targetCollection: "jobs",
      targetId: jobId,
      after: { status: nextStatus },
      createdAt: now,
    });
  });
  return { id: jobId, status: nextStatus };
});

exports.updateHiringWorkflow = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }
  const actor = await assertEmployee(request.auth.uid);
  const data = request.data || {};
  const action = cleanString(data.action, 60);
  const now = admin.firestore.FieldValue.serverTimestamp();

  if (action === "interview_review") {
    const applicationId = requireString(data, "applicationId", "Application ID");
    const candidateUid = requireString(data, "candidateUid", "Candidate UID");
    const notes = requireString(data, "notes", "Review notes");
    const reviewRef = db.collection("reviews").doc();
    await db.runTransaction(async (transaction) => {
      transaction.set(reviewRef, {
        id: reviewRef.id,
        type: "interview_review",
        candidate_uid: candidateUid,
        application_id: applicationId,
        stage: normalizeHiringStage(data.stage),
        rating: cleanString(data.rating || "4", 20),
        recommendation: cleanString(data.recommendation || "continue", 80),
        notes: cleanString(notes, 5000),
        status: "completed",
        createdAt: now,
        createdBy: request.auth.uid,
        updatedAt: now,
        updatedBy: request.auth.uid,
      });
      transaction.set(db.collection("activityLogs").doc(), {
        actorUid: request.auth.uid,
        actorEmail: actor.email || request.auth.token.email || "",
        action: "interview_review_added",
        outcome: "success",
        targetCollection: "reviews",
        targetId: reviewRef.id,
        after: { applicationId, candidateUid },
        createdAt: now,
      });
    });
    return { id: reviewRef.id };
  }

  const applicationId = requireString(data, "applicationId", "Application ID");
  const appRef = db.collection("applications").doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) throw new HttpsError("not-found", "Application was not found.");
  const application = appSnap.data() || {};
  const candidateUid = application.candidate_uid || application.candidateId || application.uid || application.owner_uid || data.candidateUid || "";
  const candidateRef = candidateUid ? db.collection("candidates").doc(candidateUid) : null;

  await db.runTransaction(async (transaction) => {
    const appData = (await transaction.get(appRef)).data() || application;
    const currentStage = normalizeHiringStage(appData.workflowStage, appData.status || appData.lifecycle_stage);
    let appPatch = { updatedAt: now, updatedBy: request.auth.uid };
    let candidatePatch = candidateUid ? { uid: candidateUid, updatedAt: now, updatedBy: request.auth.uid } : null;
    let activityAction = action;
    let before = {};
    let after = {};

    if (action === "move_stage") {
      const transition = validateHiringTransition(currentStage, data.nextStage, data.allowJump && actor.role === "admin");
      const status = HIRING_STAGE_TO_APPLICATION_STATUS[transition.to] || "applied";
      appPatch = {
        ...appPatch,
        workflowStage: transition.to,
        status,
        lifecycle_stage: status,
        interviewStatus: transition.to,
      };
      candidatePatch = candidatePatch ? { ...candidatePatch, workflowStage: transition.to, interviewStatus: transition.to } : null;
      before = { workflowStage: transition.from };
      after = { workflowStage: transition.to };
      activityAction = "hiring_stage_transition";
    } else if (action === "approve" || action === "reject") {
      const rejected = action === "reject";
      const reason = cleanString(data.reason, 1000);
      if (rejected && !reason) throw new HttpsError("invalid-argument", "Add a rejection reason.");
      const workflowStage = rejected ? currentStage : "approved";
      const status = rejected ? "not_shortlisted" : HIRING_STAGE_TO_APPLICATION_STATUS.approved;
      appPatch = {
        ...appPatch,
        workflowStage,
        candidateApprovalStatus: rejected ? "rejected" : "approved",
        rejectionReason: rejected ? reason : "",
        status,
        lifecycle_stage: status,
      };
      candidatePatch = candidatePatch ? {
        ...candidatePatch,
        workflowStage,
        candidateApprovalStatus: rejected ? "rejected" : "approved",
        interviewStatus: rejected ? "rejected" : "approved",
        rejectionReason: rejected ? reason : "",
      } : null;
      after = { candidateApprovalStatus: rejected ? "rejected" : "approved", workflowStage };
      activityAction = rejected ? "candidate_rejected" : "candidate_approved";
    } else if (action === "assign") {
      const assignedEmployeeId = cleanString(data.assignedEmployeeId || request.auth.uid, 160);
      appPatch = { ...appPatch, assignedEmployeeId };
      candidatePatch = candidatePatch ? { ...candidatePatch, assignedEmployeeId } : null;
      after = { assignedEmployeeId };
      activityAction = "candidate_assigned";
    } else if (action === "application_status") {
      const transition = validateApplicationTransition(appData.status || appData.lifecycle_stage, data.status);
      appPatch = { ...appPatch, status: transition.to, lifecycle_stage: transition.to };
      before = { status: transition.from };
      after = { status: transition.to };
      activityAction = "application_status_transition";
      if (transition.to === "onboarding") {
        transaction.set(db.collection("onboarding").doc(applicationId), {
          id: applicationId,
          application_id: applicationId,
          candidate_uid: candidateUid,
          candidate_name: appData.full_name || appData.candidate_name || "",
          status: "in_progress",
          tasks: {
            offer_letter: "pending",
            signed_offer: "pending",
            pan: "pending",
            bank: "pending",
            uan: "pending",
            form12bb: "pending",
          },
          updatedAt: now,
          updatedBy: request.auth.uid,
        }, { merge: true });
      }
    } else {
      throw new HttpsError("invalid-argument", "Unsupported hiring workflow action.");
    }

    transaction.set(appRef, appPatch, { merge: true });
    if (candidateRef && candidatePatch) transaction.set(candidateRef, candidatePatch, { merge: true });
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: activityAction,
      outcome: "success",
      targetCollection: "applications",
      targetId: applicationId,
      before,
      after,
      reason: cleanString(data.reason, 1000),
      createdAt: now,
    });
  });
  return { id: applicationId, action };
});

exports.resolveReviewDecision = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }
  const actor = await assertEmployee(request.auth.uid);
  const reviewId = requireString(request.data || {}, "reviewId", "Review ID");
  const status = normalizeStatus(request.data?.status, REVIEW_STATUSES, "");
  if (!status) throw new HttpsError("invalid-argument", "Choose a supported review status.");

  const reviewRef = db.collection("reviews").doc(reviewId);
  const reviewSnap = await reviewRef.get();
  if (!reviewSnap.exists) throw new HttpsError("not-found", "Review was not found.");
  const review = { id: reviewSnap.id, ...reviewSnap.data() };
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  const resolvedStatus = reviewDocumentStatus(status);

  batch.set(reviewRef, {
    status,
    resolvedAt: status === "pending_review" ? null : now,
    resolvedBy: status === "pending_review" ? null : request.auth.uid,
    updatedAt: now,
    updatedBy: request.auth.uid,
  }, { merge: true });

  if (review.owner_uid) {
    const aliases = REVIEW_DOCUMENT_TYPES[review.type] || [];
    if (aliases.length > 0) {
      const docsSnap = await db.collection("documents").where("owner_uid", "==", review.owner_uid).get();
      docsSnap.docs.forEach((item) => {
        const document = item.data() || {};
        if (review.application_id && document.application_id && document.application_id !== review.application_id) return;
        if (!typeMatches(document.type, aliases)) return;
        batch.set(item.ref, {
          status: resolvedStatus,
          reviewedAt: now,
          reviewedBy: request.auth.uid,
          updatedAt: now,
          updatedBy: request.auth.uid,
        }, { merge: true });
      });
    }
  }

  if (review.application_id) {
    const task = REVIEW_TASK_BY_TYPE[review.type];
    if (task) {
      batch.set(db.collection("onboarding").doc(review.application_id), {
        id: review.application_id,
        application_id: review.application_id,
        candidate_uid: review.owner_uid || review.candidate_uid || "",
        status: status === "approved" ? "under_review" : "in_progress",
        tasks: { [task]: reviewTaskStatus(status) },
        updatedAt: now,
        updatedBy: request.auth.uid,
      }, { merge: true });
    }
    if (status === "approved") {
      const appRef = db.collection("applications").doc(review.application_id);
      const appSnap = await appRef.get();
      if (appSnap.exists) {
        const app = appSnap.data() || {};
        if (review.type === "signed_offer" && app.status === "offer_sent") {
          batch.set(appRef, { status: "offer_signed", lifecycle_stage: "offer_signed", updatedAt: now, updatedBy: request.auth.uid }, { merge: true });
        }
        if (["signed_onboarding", "onboarding_pack", "onboarding", "form12bb"].includes(review.type) && app.status === "offer_signed") {
          batch.set(appRef, { status: "onboarding", lifecycle_stage: "onboarding", updatedAt: now, updatedBy: request.auth.uid }, { merge: true });
        }
      }
    }
  }

  if (review.owner_uid && ["bank_details", "pan", "uan"].includes(review.type)) {
    const field = review.type === "bank_details" ? "bankStatus" : review.type === "pan" ? "panStatus" : "uanStatus";
    const reviewedAt = review.type === "bank_details" ? "bankReviewedAt" : review.type === "pan" ? "panReviewedAt" : "uanReviewedAt";
    const reviewedBy = review.type === "bank_details" ? "bankReviewedBy" : review.type === "pan" ? "panReviewedBy" : "uanReviewedBy";
    batch.set(db.collection("consultants").doc(review.owner_uid), {
      [field]: status === "approved" ? "approved" : resolvedStatus,
      [reviewedAt]: now,
      [reviewedBy]: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
  }

  batch.set(db.collection("activityLogs").doc(), {
    actorUid: request.auth.uid,
    actorEmail: actor.email || request.auth.token.email || "",
    action: "review_resolution",
    outcome: "success",
    targetCollection: "reviews",
    targetId: reviewId,
    before: { status: review.status || "pending_review", type: review.type || "" },
    after: { status },
    createdAt: now,
  });
  await batch.commit();
  return { id: reviewId, status };
});

exports.sendPortalPasswordSetup = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }
  const data = request.data || {};
  const email = normalizeEmail(requireString(data, "email", "Email"));
  const role = cleanString(data.role || "candidate", 40);
  if (!isValidEmail(email)) throw new HttpsError("invalid-argument", "Enter a valid email.");
  const actor = role === "consultant" ? await assertEmployee(request.auth.uid) : await assertAdmin(request.auth.uid);
  const url = cleanString(data.url || "https://saturnmax.com/login", 300);
  const setupLink = await admin.auth().generatePasswordResetLink(email, {
    url,
    handleCodeInApp: false,
  });
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection("activityLogs").add({
    actorUid: request.auth.uid,
    actorEmail: actor.email || request.auth.token.email || "",
    action: "portal_password_setup_link_generated",
    outcome: "success",
    targetCollection: "users",
    targetId: email,
    after: { email, role },
    createdAt: now,
  });
  return { email, role, setupLink };
});

exports.convertCandidateToConsultant = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }

  const actor = await assertEmployee(request.auth.uid);
  const data = request.data || {};
  const applicationId = requireString(data, "applicationId", "Application ID");
  const profile = data.profile || {};
  const consultantType = requireString(profile, "consultantType", "Consultant type");
  const roleTitle = requireString(profile, "roleTitle", "Role title");
  const startDate = requireString(profile, "startDate", "Start date");
  const workLocation = requireString(profile, "workLocation", "Work location");
  const overrideReason = String(data.overrideReason || "").trim();

  if (!CONSULTANT_TYPES.has(consultantType)) {
    throw new HttpsError("invalid-argument", "Choose a supported consultant type.");
  }
  if (data.overrideApproved && actor.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can override approval during conversion.");
  }
  if (data.overrideApproved && !overrideReason) {
    throw new HttpsError("invalid-argument", "Add an override reason before converting this candidate.");
  }

  const appRef = db.collection("applications").doc(applicationId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const result = await db.runTransaction(async (transaction) => {
    const appSnap = await transaction.get(appRef);
    if (!appSnap.exists) {
      throw new HttpsError("not-found", "Application was not found.");
    }

    const appData = appSnap.data() || {};
    const candidateUid = appData.candidate_uid || appData.candidateId || appData.uid || appData.owner_uid;
    if (!candidateUid) {
      throw new HttpsError("failed-precondition", "Application is missing candidate ownership.");
    }

    const candidateRef = db.collection("candidates").doc(candidateUid);
    const consultantRef = db.collection("consultants").doc(candidateUid);
    const userRef = db.collection("users").doc(candidateUid);
    const [candidateSnap, consultantSnap, userSnap] = await Promise.all([
      transaction.get(candidateRef),
      transaction.get(consultantRef),
      transaction.get(userRef),
    ]);
    const candidateData = candidateSnap.exists ? candidateSnap.data() || {} : {};
    const candidateUser = userSnap.exists ? userSnap.data() || {} : {};
    if (candidateUser.role && candidateUser.role !== "candidate") {
      throw new HttpsError("failed-precondition", "Only candidate accounts can be converted to consultants.");
    }
    const email = normalizeEmail(profile.email || appData.email || candidateData.email);
    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "Candidate email is required before conversion.");
    }

    const emailIndexRef = db.collection("consultantEmailIndex").doc(email);
    const emailIndexSnap = await transaction.get(emailIndexRef);
    if (consultantSnap.exists || appData.convertedToConsultantId || candidateData.convertedToConsultantId) {
      throw new HttpsError("already-exists", "This candidate is already converted to a consultant.");
    }
    if (emailIndexSnap.exists && emailIndexSnap.data()?.uid !== candidateUid) {
      throw new HttpsError("already-exists", "A consultant with this email already exists.");
    }
    if (!approvedForConversion(appData, candidateData) && !data.overrideApproved) {
      throw new HttpsError("failed-precondition", "Approve the candidate before converting to consultant.");
    }

    const name = String(
      profile.name
      || appData.full_name
      || appData.candidate_name
      || candidateData.name
      || "Consultant"
    ).trim();
    const skills = splitTags(profile.skills || profile.primary_skills || appData.primary_skills || candidateData.primary_skills);
    const consultant = {
      uid: candidateUid,
      authUid: candidateUid,
      email,
      name,
      phone: profile.phone || appData.phone || candidateData.phone || "",
      consultantId: profile.consultantId || consultantId(candidateUid),
      consultantType,
      sourceCandidateId: candidateUid,
      sourceApplicationId: applicationId,
      roleTitle,
      role: roleTitle,
      clientName: profile.clientName || "",
      client: profile.clientName || "",
      project: profile.clientName || "",
      startDate,
      workLocation,
      rate: actor.role === "admin" ? profile.rate || "" : "",
      monthlyPay: actor.role === "admin" ? profile.rate || "" : "",
      skills,
      notes: profile.notes || "",
      loginEnabled: true,
      loginSetupRequired: false,
      credentialsStatus: "invite_pending_send",
      status: "Active consultant",
      bankStatus: "pending_review",
      panStatus: "pending_review",
      uanStatus: "pending_review",
      gstStatus: "not_required",
      createdByEmployeeId: request.auth.uid,
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    };

    transaction.set(consultantRef, consultant);
    transaction.set(userRef, {
      role: "consultant",
      email,
      name,
      status: "active",
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(emailIndexRef, {
      email,
      uid: candidateUid,
      consultantId: candidateUid,
      source: "candidate_conversion",
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(appRef, {
      workflowStage: "converted_to_consultant",
      interviewStatus: "converted",
      candidateApprovalStatus: "approved",
      convertedToConsultantId: candidateUid,
      convertedAt: now,
      convertedByEmployeeId: request.auth.uid,
      consultantType,
      consultantRoleTitle: roleTitle,
      status: "consultant_active",
      lifecycle_stage: "consultant_active",
      credentialsStatus: "invite_pending_send",
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(candidateRef, {
      uid: candidateUid,
      email,
      name,
      workflowStage: "converted_to_consultant",
      interviewStatus: "converted",
      candidateApprovalStatus: "approved",
      convertedToConsultantId: candidateUid,
      convertedAt: now,
      convertedByEmployeeId: request.auth.uid,
      credentialsStatus: "invite_pending_send",
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: "candidate_converted_to_consultant",
      outcome: "success",
      targetCollection: "consultants",
      targetId: candidateUid,
      before: { applicationId, workflowStage: appData.workflowStage || appData.status || "" },
      after: { workflowStage: "converted_to_consultant", consultantType },
      reason: overrideReason,
      createdAt: now,
    });

    return {
      uid: candidateUid,
      email,
      name,
      consultant,
    };
  });

  return {
    uid: result.uid,
    email: result.email,
    name: result.name,
    consultant: result.consultant,
    passwordEmailRequired: true,
  };
});

exports.adminUpsertPortalUser = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an admin first.");
  }

  const actor = await assertAdmin(request.auth.uid);
  const data = request.data || {};
  const name = requireString(data, "name", "Full name");
  const email = normalizeEmail(requireString(data, "email", "Email"));
  const role = requireString(data, "role", "Role");
  if (!ROLES.has(role)) throw new HttpsError("invalid-argument", "Choose a supported role.");
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid email.");
  }

  const { user, created } = await getOrCreateAuthUserForAccount({
    uid: data.uid || "",
    email,
    name,
    status: data.status || "active",
  });
  const uid = user.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const userRef = db.collection("users").doc(uid);
  const activityRef = db.collection("activityLogs").doc();

  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const previousUser = userSnap.exists ? userSnap.data() || {} : {};
    const previousEmail = normalizeEmail(previousUser.email || "");
    const previousRole = previousUser.role || "";
    if (previousRole === "consultant" && role !== "consultant" && previousEmail) {
      transaction.delete(db.collection("consultantEmailIndex").doc(previousEmail));
    }
    transaction.set(userRef, {
      uid,
      role,
      email,
      name,
      phone: data.phone || "",
      title: data.title || "",
      department: data.department || "",
      location: data.location || "",
      status: data.status || "active",
      ...(userSnap.exists && userSnap.data()?.createdAt ? {} : { createdAt: now }),
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });

    if (role === "candidate") {
      transaction.set(db.collection("candidates").doc(uid), {
        uid,
        email,
        name,
        phone: data.phone || "",
        role_label: "Job Candidate",
        updatedAt: now,
        updatedBy: request.auth.uid,
      }, { merge: true });
    }

    if (role === "consultant") {
      if (previousEmail && previousEmail !== email) {
        transaction.delete(db.collection("consultantEmailIndex").doc(previousEmail));
      }
      transaction.set(db.collection("consultants").doc(uid), {
        uid,
        authUid: uid,
        email,
        name,
        phone: data.phone || "",
        consultantId: data.consultantId || consultantId(uid),
        roleTitle: data.title || "Consultant",
        role: data.title || "Consultant",
        consultantType: data.consultantType || "Contract",
        loginEnabled: true,
        loginSetupRequired: false,
        status: "Active consultant",
        bankStatus: "pending_review",
        panStatus: "pending_review",
        uanStatus: "pending_review",
        updatedAt: now,
        updatedBy: request.auth.uid,
      }, { merge: true });
      transaction.set(db.collection("consultantEmailIndex").doc(email), {
        email,
        uid,
        consultantId: uid,
        source: "admin_user_manager",
        updatedAt: now,
        updatedBy: request.auth.uid,
      }, { merge: true });
    }

    transaction.set(activityRef, {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: "admin_user_upserted",
      outcome: "success",
      targetCollection: "users",
      targetId: uid,
      after: { email, role, authUserCreated: created },
      createdAt: now,
    });
  });

  return {
    uid,
    email,
    name,
    role,
    authUserCreated: created,
    passwordEmailRequired: true,
  };
});

exports.adminDeactivatePortalUser = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an admin first.");
  }

  const actor = await assertAdmin(request.auth.uid);
  const uid = requireString(request.data || {}, "uid", "User ID");
  const now = admin.firestore.FieldValue.serverTimestamp();
  await admin.auth().updateUser(uid, { disabled: true }).catch((err) => {
    if (err.code !== "auth/user-not-found") throw err;
  });
  const [userSnap, consultantSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("consultants").doc(uid).get(),
  ]);
  const existingRole = userSnap.exists ? userSnap.data()?.role : "";
  await db.collection("users").doc(uid).set({
    status: "inactive",
    disabled: true,
    updatedAt: now,
    updatedBy: request.auth.uid,
  }, { merge: true });
  if (existingRole === "consultant" || consultantSnap.exists) {
    await db.collection("consultants").doc(uid).set({
      status: "Inactive",
      loginEnabled: false,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
  }
  await db.collection("activityLogs").add({
    actorUid: request.auth.uid,
    actorEmail: actor.email || request.auth.token.email || "",
    action: "admin_user_deactivated",
    outcome: "success",
    targetCollection: "users",
    targetId: uid,
    createdAt: now,
  });
  return { uid, disabled: true };
});
