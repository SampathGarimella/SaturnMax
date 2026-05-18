const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const { randomUUID } = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

const CONSULTANT_TYPES = new Set(["Contract", "Full-time", "Bench", "Client-assigned"]);
const ROLES = new Set(["candidate", "consultant", "employee", "admin"]);
const APP_BASE_URL = "https://saturnmax.com";
const DEFAULT_REPLY_TO = "hr@saturnmax.com";
const OPS_EMAIL = "hr@saturnmax.com";
const MAIL_COLLECTION = "mail";
const EMAIL_TEMPLATES_COLLECTION = "emailTemplates";
const EMAIL_EVENTS_COLLECTION = "emailEvents";
const INTERVIEWS_COLLECTION = "interviews";
const OFFER_TEMPLATES_COLLECTION = "offerTemplates";
const OFFER_LETTERS_COLLECTION = "offerLetters";
const CANDIDATE_VISIBLE_STATUSES = new Set([
  "screening",
  "interview",
  "selected",
  "offer_sent",
  "offer_signed",
  "onboarding",
  "not_shortlisted",
]);
const REVIEW_RESULT_EMAIL_TYPES = new Set([
  "signed_offer",
  "signed_onboarding",
  "signed_onboarding_document",
  "onboarding_pack",
  "onboarding",
  "form12bb",
  "form_12bb",
  "pan",
  "pan_details",
  "pan_card",
  "uan",
  "uan_details",
  "epf",
  "epfo",
  "bank_details",
]);
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
const DEFAULT_EMAIL_TEMPLATES = {
  candidate_signup_verification_reminder: {
    subject: "Verify your SaturnMax candidate account",
    text: "Hi {{candidateName}},\n\nPlease verify your email before applying to roles. Open your candidate portal when you are ready.\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  application_received: {
    subject: "Application received: {{positionTitle}}",
    text: "Hi {{candidateName}},\n\nWe received your application for {{positionTitle}}. You can track status, messages, interviews, and documents from your Candidate Portal.\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  internal_new_application: {
    subject: "New candidate application: {{positionTitle}}",
    text: "{{candidateName}} applied for {{positionTitle}}.\n\nEmail: {{candidateEmail}}\nSkills: {{skills}}\n\nOpen Operations: {{operationsUrl}}",
  },
  lead_received_internal: {
    subject: "New SaturnMax website lead: {{subject}}",
    text: "{{name}} submitted a website enquiry.\n\nEmail: {{email}}\nCompany: {{company}}\nMessage: {{message}}\n\nOpen Leads: {{leadsUrl}}",
  },
  application_status_update: {
    subject: "Application update: {{publicStatus}}",
    text: "Hi {{candidateName}},\n\nYour application for {{positionTitle}} is now {{publicStatus}}.\n\nNext step: {{nextAction}}\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  interview_scheduled: {
    subject: "Interview scheduled: {{positionTitle}}",
    text: "Hi {{candidateName}},\n\nYour {{interviewType}} interview for {{positionTitle}} is scheduled.\n\nDate/time: {{startsAt}}\nInterviewer: {{interviewerName}}\nMeeting link: {{meetingLink}}\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  internal_interview_scheduled: {
    subject: "Interview scheduled for {{candidateName}}",
    text: "{{candidateName}} has a {{interviewType}} interview for {{positionTitle}}.\n\nDate/time: {{startsAt}}\nInterviewer: {{interviewerName}}\nMeeting link: {{meetingLink}}\n\nOpen candidate: {{operationsUrl}}",
  },
  offer_letter_available: {
    subject: "Offer letter available: {{positionTitle}}",
    text: "Hi {{candidateName}},\n\nYour offer letter for {{positionTitle}} is available in the Candidate Portal. Please download, sign, and upload the signed PDF for review.\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  signed_document_received: {
    subject: "Document received for review",
    text: "Hi {{candidateName}},\n\nWe received your {{documentTitle}} and our team will review it. You can track the review result in your portal.\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  internal_signed_document_received: {
    subject: "Document review needed: {{documentTitle}}",
    text: "{{candidateName}} uploaded {{documentTitle}} for {{positionTitle}}.\n\nOpen Reviews: {{reviewsUrl}}",
  },
  review_result: {
    subject: "Document review update: {{documentTitle}}",
    text: "Hi {{candidateName}},\n\nYour {{documentTitle}} review result is {{reviewStatus}}.\n\n{{nextAction}}\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  onboarding_document_requested: {
    subject: "Onboarding document requested: {{documentTitle}}",
    text: "Hi {{candidateName}},\n\nPlease upload {{documentTitle}} from your Candidate Portal so the SaturnMax team can continue onboarding.\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  onboarding_started: {
    subject: "Onboarding checklist started",
    text: "Hi {{candidateName}},\n\nYour signed offer has been approved. Please complete the onboarding checklist and upload requested documents in your Candidate Portal.\n\nCandidate Portal: {{candidatePortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  consultant_access_instructions: {
    subject: "Welcome to SaturnMax Consultant Portal",
    text: "Hi {{name}},\n\nYour consultant profile has been created with SaturnMax Technologies.\n\nConsultant Portal: {{consultantPortalUrl}}\nLogin Email: {{email}}\nPassword setup link: {{setupLink}}\n\nPlease set your password and complete or verify your profile.\n\nRegards,\nSaturnMax Technologies",
  },
  portal_account_setup: {
    subject: "Set up your SaturnMax portal account",
    text: "Hi {{name}},\n\nYour SaturnMax {{roleLabel}} account is ready.\n\nPortal: {{portalUrl}}\nLogin Email: {{email}}\nPassword setup link: {{setupLink}}\n\nRegards,\nSaturnMax Technologies",
  },
  consultant_converted: {
    subject: "Consultant profile created",
    text: "Hi {{name}},\n\nYour SaturnMax consultant profile is ready. Please use the Consultant Portal for project, document, compliance, and account updates.\n\nConsultant Portal: {{consultantPortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
  compliance_review_result: {
    subject: "Compliance review update: {{documentTitle}}",
    text: "Hi {{name}},\n\nYour {{documentTitle}} review result is {{reviewStatus}}.\n\n{{nextAction}}\n\nConsultant Portal: {{consultantPortalUrl}}\n\nRegards,\nSaturnMax Technologies",
  },
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTemplate(source = "", data = {}) {
  return String(source || "").replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const value = key.split(".").reduce((acc, part) => (acc && acc[part] != null ? acc[part] : ""), data);
    return String(value == null ? "" : value);
  });
}

function textToHtml(text = "") {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function publicStatusLabel(status = "") {
  const labels = {
    applied: "Submitted",
    screening: "Under Review",
    interview: "Interview",
    selected: "Offer",
    offer_sent: "Offer Sent",
    offer_signed: "Offer Signed",
    onboarding: "Onboarding",
    consultant_active: "Converted",
    not_shortlisted: "Not Selected",
  };
  return labels[status] || status.replace(/_/g, " ");
}

function nextActionForStatus(status = "") {
  const actions = {
    screening: "Keep your profile and resume ready for recruiter review.",
    interview: "Watch your portal and email for interview scheduling.",
    selected: "The hiring team is preparing offer documentation.",
    offer_sent: "Download the offer letter, sign it, and upload the signed copy.",
    offer_signed: "Complete onboarding documents shared by the employee team.",
    onboarding: "Finish onboarding and compliance review.",
    not_shortlisted: "You can apply to another matching role when ready.",
  };
  return actions[status] || "Open your portal for the latest next step.";
}

function candidatePortalUrl(path = "/dashboard/applications") {
  return `${APP_BASE_URL}${path}`;
}

function consultantPortalUrl(path = "/consultant-dashboard") {
  return `${APP_BASE_URL}${path}`;
}

function operationsUrl(path = "/employee-dashboard/hiring/candidates") {
  return `${APP_BASE_URL}${path}`;
}

function documentTitle(type = "") {
  const labels = {
    signed_offer: "signed offer letter",
    signed_onboarding: "signed onboarding document",
    signed_onboarding_document: "signed onboarding document",
    onboarding_pack: "onboarding pack",
    onboarding: "onboarding document",
    form12bb: "Form 12BB",
    form_12bb: "Form 12BB",
    pan: "PAN/tax details",
    pan_details: "PAN/tax details",
    pan_card: "PAN card",
    uan: "UAN/EPF details",
    uan_details: "UAN/EPF details",
    epf: "EPF details",
    epfo: "EPFO details",
    bank_details: "bank details",
    compliance: "compliance document",
  };
  return labels[type] || String(type || "document").replace(/_/g, " ");
}

async function getTemplate(templateId) {
  const fallback = DEFAULT_EMAIL_TEMPLATES[templateId] || {
    subject: "SaturnMax notification",
    text: "Open your SaturnMax portal for the latest update.",
  };
  const snap = await db.collection(EMAIL_TEMPLATES_COLLECTION).doc(templateId).get().catch(() => null);
  if (!snap?.exists) return fallback;
  const data = snap.data() || {};
  return {
    subject: data.subject || fallback.subject,
    text: data.text || fallback.text,
    html: data.html || fallback.html || "",
  };
}

async function recordEmailEvent({
  templateId,
  to,
  type,
  entityType,
  entityId,
  status = "queued",
  mailId = "",
  metadata = {},
}) {
  await db.collection(EMAIL_EVENTS_COLLECTION).add({
    templateId,
    to: Array.isArray(to) ? to : [to].filter(Boolean),
    type: type || templateId,
    entityType: entityType || "",
    entityId: entityId || "",
    status,
    mailId,
    metadata,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function emailDeliveryStatus(delivery = {}) {
  const state = String(delivery.state || delivery.status || "").toUpperCase();
  if (state === "SUCCESS") return "delivered";
  if (state === "ERROR") return "failed";
  if (state === "RETRY") return "retry_requested";
  if (state === "PROCESSING") return "processing";
  if (state === "PENDING") return "pending";
  return state ? state.toLowerCase() : "";
}

async function queueEmail(templateId, to, data = {}, metadata = {}) {
  const recipients = Array.isArray(to)
    ? to.map(normalizeEmail).filter(isValidEmail)
    : [normalizeEmail(to)].filter(isValidEmail);
  if (recipients.length === 0) {
    await recordEmailEvent({
      templateId,
      to: [],
      type: metadata.type,
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      status: "skipped_no_recipient",
      metadata,
    });
    return { queued: false, reason: "missing-recipient" };
  }

  const template = await getTemplate(templateId);
  const subject = renderTemplate(template.subject, data);
  const text = renderTemplate(template.text, data);
  const html = renderTemplate(template.html || textToHtml(template.text), data);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const mailRef = db.collection(MAIL_COLLECTION).doc();
  await mailRef.set({
    to: recipients,
    replyTo: DEFAULT_REPLY_TO,
    template: { name: templateId, data },
    message: { subject, text, html },
    metadata: {
      templateId,
      type: metadata.type || templateId,
      entityType: metadata.entityType || "",
      entityId: metadata.entityId || "",
    },
    createdAt: now,
    updatedAt: now,
  });
  await recordEmailEvent({
    templateId,
    to: recipients,
    type: metadata.type || templateId,
    entityType: metadata.entityType,
    entityId: metadata.entityId,
    status: "queued",
    mailId: mailRef.id,
    metadata,
  });
  return { queued: true, mailId: mailRef.id };
}

async function seedDefaultEmailTemplates(actorUid = "system") {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  Object.entries(DEFAULT_EMAIL_TEMPLATES).forEach(([id, template]) => {
    batch.set(db.collection(EMAIL_TEMPLATES_COLLECTION).doc(id), {
      id,
      subject: template.subject,
      text: template.text,
      html: template.html || "",
      active: true,
      systemDefault: true,
      updatedAt: now,
      updatedBy: actorUid,
    }, { merge: true });
  });
  await batch.commit();
}

function storageDownloadUrl(path, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function renderOfferPdfBuffer({
  candidateName,
  positionTitle,
  consultantType,
  clientName,
  startDate,
  workLocation,
  compensation,
  notes,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("SaturnMax Technologies Private Limited", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#475569").text("India", { align: "center" });
    doc.moveDown(2);
    doc.fillColor("#0f172a").fontSize(16).text("Offer Letter", { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Date: ${new Date().toLocaleDateString("en-IN")}`);
    doc.moveDown();
    doc.text(`Dear ${candidateName || "Candidate"},`);
    doc.moveDown();
    doc.text(
      `We are pleased to offer you the role of ${positionTitle || "Consultant"} with SaturnMax Technologies Private Limited. This offer is subject to successful completion of onboarding, compliance checks, and document verification.`
    );
    doc.moveDown();
    doc.fontSize(12).text("Engagement Details", { underline: true });
    doc.moveDown(0.5);
    const rows = [
      ["Role title", positionTitle || "Consultant"],
      ["Consultant type", consultantType || "Contract"],
      ["Client / project", clientName || "To be assigned"],
      ["Start date", startDate || "To be confirmed"],
      ["Work location", workLocation || "India"],
      ["Compensation / rate", compensation || "As discussed and approved"],
    ];
    rows.forEach(([label, value]) => {
      doc.fontSize(10).fillColor("#475569").text(`${label}: `, { continued: true });
      doc.fillColor("#0f172a").text(value);
    });
    if (notes) {
      doc.moveDown();
      doc.fontSize(12).text("Additional Notes", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(notes);
    }
    doc.moveDown(2);
    doc.text("Please sign this offer letter and upload the signed PDF in your Candidate Portal.");
    doc.moveDown(2);
    doc.text("Regards,");
    doc.text("SaturnMax Technologies Private Limited");
    doc.moveDown(2);
    doc.text("Candidate signature: ______________________________");
    doc.text("Date: __________________");
    doc.end();
  });
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

  const { user, created } = await getOrCreateAuthUser({ email, name });
  const uid = user.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const consultantRef = db.collection("consultants").doc(uid);
  const emailIndexRef = db.collection("consultantEmailIndex").doc(email);
  const userRef = db.collection("users").doc(uid);
  const activityRef = db.collection("activityLogs").doc();
  let alreadyExists = false;

  await db.runTransaction(async (transaction) => {
    const [consultantSnap, emailIndexSnap, userSnap] = await Promise.all([
      transaction.get(consultantRef),
      transaction.get(emailIndexRef),
      transaction.get(userRef),
    ]);

    if (emailIndexSnap.exists && emailIndexSnap.data()?.uid !== uid) {
      throw new HttpsError("already-exists", "A consultant with this email already exists.");
    }
    alreadyExists = consultantSnap.exists;

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
      updatedAt: now,
      updatedBy: request.auth.uid,
    };
    if (!consultantSnap.exists) {
      consultant.createdAt = now;
      consultant.createdBy = request.auth.uid;
    }

    transaction.set(consultantRef, consultant, { merge: true });
    transaction.set(userRef, {
      role: "consultant",
      email,
      name,
      status: "active",
      ...(userSnap.exists ? {} : { createdAt: now, createdBy: request.auth.uid }),
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
      action: alreadyExists ? "manual_consultant_linked" : "manual_consultant_invited",
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
    alreadyExists,
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
  const lead = {
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
  };
  await leadRef.set(lead);
  await queueEmail("lead_received_internal", OPS_EMAIL, {
    ...lead,
    leadsUrl: operationsUrl("/employee-dashboard/leads"),
  }, {
    type: "lead_received_internal",
    entityType: "leads",
    entityId: leadRef.id,
  });
  return { id: leadRef.id };
});

exports.submitCandidateApplication = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as a candidate first.");
  }
  if (request.auth.token.email_verified === false) {
    throw new HttpsError("failed-precondition", "Please verify your email before applying.");
  }
  const uid = request.auth.uid;
  const data = request.data || {};
  const fullName = requireString(data, "full_name", "Full name");
  const phone = requireString(data, "phone", "Phone");
  const positionTitle = requireString(data, "position_title", "Position");
  const email = normalizeEmail(request.auth.token.email || data.email || "");
  if (!isValidEmail(email)) throw new HttpsError("invalid-argument", "Your account email is required before applying.");

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() || {} : {};
  if (userData.role && userData.role !== "candidate") {
    throw new HttpsError("failed-precondition", "Please use a candidate account to apply for jobs.");
  }

  const positionId = cleanString(data.position_id, 180);
  if (positionId) {
    const duplicate = await db.collection("applications")
      .where("candidate_uid", "==", uid)
      .where("position_id", "==", positionId)
      .limit(1)
      .get();
    if (!duplicate.empty) {
      throw new HttpsError("already-exists", "You already applied to this job.");
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const appRef = db.collection("applications").doc();
  const candidateProfile = {
    uid,
    email,
    name: cleanString(fullName, 160),
    phone: cleanString(phone, 60),
    current_location: cleanString(data.current_location, 160),
    current_company: cleanString(data.current_company, 160),
    portfolio_url: cleanString(data.portfolio_url, 500),
    resume_url: cleanString(data.resume_url, 1000),
    primary_skills: cleanString(data.primary_skills, 2000),
    preferred_work_mode: cleanString(data.preferred_work_mode, 120),
    years_experience: cleanString(data.years_experience, 80),
    notice_period: cleanString(data.notice_period, 80),
    current_ctc_lpa: cleanString(data.current_ctc_lpa, 80),
    expected_ctc_lpa: cleanString(data.expected_ctc_lpa, 80),
    introduction: cleanString(data.introduction, 5000),
    role_label: "Job Candidate",
    updatedAt: now,
    updatedBy: uid,
  };
  const application = {
    id: appRef.id,
    full_name: candidateProfile.name,
    email,
    phone: candidateProfile.phone,
    current_location: candidateProfile.current_location,
    current_company: candidateProfile.current_company,
    portfolio_url: candidateProfile.portfolio_url,
    resume_url: candidateProfile.resume_url,
    primary_skills: candidateProfile.primary_skills,
    preferred_work_mode: candidateProfile.preferred_work_mode,
    years_experience: candidateProfile.years_experience,
    notice_period: candidateProfile.notice_period,
    current_ctc_lpa: candidateProfile.current_ctc_lpa,
    expected_ctc_lpa: candidateProfile.expected_ctc_lpa,
    introduction: candidateProfile.introduction,
    position_id: positionId,
    position_title: cleanString(positionTitle, 220),
    candidate_uid: uid,
    candidate_name: candidateProfile.name,
    status: "applied",
    lifecycle_stage: "applied",
    public_status: "submitted",
    workflowStage: "applied",
    createdAt: now,
    createdBy: uid,
    updatedAt: now,
    updatedBy: uid,
  };

  await db.runTransaction(async (transaction) => {
    transaction.set(userRef, {
      role: "candidate",
      email,
      name: candidateProfile.name,
      status: userData.status || "active",
      ...(userSnap.exists && userData.createdAt ? {} : { createdAt: now, createdBy: uid }),
      updatedAt: now,
      updatedBy: uid,
    }, { merge: true });
    transaction.set(db.collection("candidates").doc(uid), {
      ...candidateProfile,
      ...(userSnap.exists ? {} : { createdAt: now, createdBy: uid }),
    }, { merge: true });
    transaction.set(appRef, application);
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: uid,
      actorEmail: email,
      action: "candidate_application_submitted",
      outcome: "success",
      targetCollection: "applications",
      targetId: appRef.id,
      after: { positionTitle: application.position_title, positionId },
      createdAt: now,
    });
  });

  await Promise.all([
    queueEmail("application_received", email, {
      candidateName: candidateProfile.name,
      positionTitle: application.position_title,
      candidatePortalUrl: candidatePortalUrl("/dashboard/applications"),
    }, {
      type: "application_received",
      entityType: "applications",
      entityId: appRef.id,
    }),
    queueEmail("internal_new_application", OPS_EMAIL, {
      candidateName: candidateProfile.name,
      candidateEmail: email,
      positionTitle: application.position_title,
      skills: candidateProfile.primary_skills || "Not provided",
      operationsUrl: operationsUrl(`/employee-dashboard/hiring/candidates/${appRef.id}`),
    }, {
      type: "internal_new_application",
      entityType: "applications",
      entityId: appRef.id,
    }),
  ]);

  return { id: appRef.id, ...application };
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
    const applicationId = cleanString(data.applicationId, 200);
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

  const applicationId = cleanString(data.applicationId, 200);
  const requestedCandidateUid = cleanString(data.candidateUid, 200);
  if (!applicationId && requestedCandidateUid) {
    const candidateRef = db.collection("candidates").doc(requestedCandidateUid);
    const candidateSnap = await candidateRef.get();
    if (!candidateSnap.exists) throw new HttpsError("not-found", "Candidate profile was not found.");
    const candidateData = candidateSnap.data() || {};
    const currentStage = normalizeHiringStage(candidateData.workflowStage, candidateData.status || candidateData.lifecycle_stage);
    let candidatePatch = { uid: requestedCandidateUid, updatedAt: now, updatedBy: request.auth.uid };
    let activityAction = action;
    let before = {};
    let after = {};

    if (action === "move_stage") {
      const transition = validateHiringTransition(currentStage, data.nextStage, data.allowJump && actor.role === "admin");
      candidatePatch = {
        ...candidatePatch,
        workflowStage: transition.to,
        interviewStatus: transition.to,
      };
      before = { workflowStage: transition.from };
      after = { workflowStage: transition.to };
      activityAction = "candidate_profile_stage_transition";
    } else if (action === "approve" || action === "reject") {
      const rejected = action === "reject";
      const reason = cleanString(data.reason, 1000);
      if (rejected && !reason) throw new HttpsError("invalid-argument", "Add a rejection reason.");
      const workflowStage = rejected ? currentStage : "approved";
      candidatePatch = {
        ...candidatePatch,
        workflowStage,
        candidateApprovalStatus: rejected ? "rejected" : "approved",
        interviewStatus: rejected ? "rejected" : "approved",
        rejectionReason: rejected ? reason : "",
      };
      after = { candidateApprovalStatus: rejected ? "rejected" : "approved", workflowStage };
      activityAction = rejected ? "candidate_profile_rejected" : "candidate_profile_approved";
    } else if (action === "assign") {
      const assignedEmployeeId = cleanString(data.assignedEmployeeId || request.auth.uid, 160);
      candidatePatch = { ...candidatePatch, assignedEmployeeId };
      after = { assignedEmployeeId };
      activityAction = "candidate_profile_assigned";
    } else {
      throw new HttpsError("failed-precondition", "Choose a candidate application before using this workflow action.");
    }

    await db.runTransaction(async (transaction) => {
      transaction.set(candidateRef, candidatePatch, { merge: true });
      transaction.set(db.collection("activityLogs").doc(), {
        actorUid: request.auth.uid,
        actorEmail: actor.email || request.auth.token.email || "",
        action: activityAction,
        outcome: "success",
        targetCollection: "candidates",
        targetId: requestedCandidateUid,
        before,
        after,
        reason: cleanString(data.reason, 1000),
        createdAt: now,
      });
    });
    return { id: requestedCandidateUid, action, profileOnly: true };
  }

  if (!applicationId) {
    throw new HttpsError("invalid-argument", "Application ID is required.");
  }
  const appRef = db.collection("applications").doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) throw new HttpsError("not-found", "Application was not found.");
  const application = appSnap.data() || {};
  const candidateUid = application.candidate_uid || application.candidateId || application.uid || application.owner_uid || data.candidateUid || "";
  const candidateRef = candidateUid ? db.collection("candidates").doc(candidateUid) : null;
  let notification = null;

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
      if (CANDIDATE_VISIBLE_STATUSES.has(status)) {
        notification = {
          status,
          candidateName: appData.full_name || appData.candidate_name || "Candidate",
          candidateEmail: normalizeEmail(appData.email || ""),
          positionTitle: appData.position_title || "your application",
        };
      }
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
      notification = {
        status,
        candidateName: appData.full_name || appData.candidate_name || "Candidate",
        candidateEmail: normalizeEmail(appData.email || ""),
        positionTitle: appData.position_title || "your application",
      };
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
      if (CANDIDATE_VISIBLE_STATUSES.has(transition.to)) {
        notification = {
          status: transition.to,
          candidateName: appData.full_name || appData.candidate_name || "Candidate",
          candidateEmail: normalizeEmail(appData.email || ""),
          positionTitle: appData.position_title || "your application",
        };
      }
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
  if (notification?.candidateEmail) {
    await queueEmail("application_status_update", notification.candidateEmail, {
      candidateName: notification.candidateName,
      positionTitle: notification.positionTitle,
      publicStatus: publicStatusLabel(notification.status),
      nextAction: nextActionForStatus(notification.status),
      candidatePortalUrl: candidatePortalUrl("/dashboard/applications"),
    }, {
      type: "application_status_update",
      entityType: "applications",
      entityId: applicationId,
    });
  }
  return { id: applicationId, action };
});

exports.scheduleInterview = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }
  const actor = await assertEmployee(request.auth.uid);
  const data = request.data || {};
  const applicationId = cleanString(data.applicationId, 200);
  const requestedCandidateUid = cleanString(data.candidateUid, 200);
  const startsAt = requireString(data, "startsAt", "Interview date/time");
  const interviewType = cleanString(data.interviewType || "Technical interview", 120);
  const interviewerName = cleanString(data.interviewerName || "SaturnMax hiring team", 160);
  const meetingLink = cleanString(data.meetingLink, 600);
  const notes = cleanString(data.notes, 2000);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const appRef = applicationId ? db.collection("applications").doc(applicationId) : null;
  const appSnap = appRef ? await appRef.get() : null;
  if (appRef && !appSnap.exists) throw new HttpsError("not-found", "Application was not found.");
  const app = appSnap?.exists ? appSnap.data() || {} : {};
  const candidateUid = app.candidate_uid || app.candidateId || app.uid || app.owner_uid || requestedCandidateUid;
  if (!candidateUid) throw new HttpsError("failed-precondition", "Application is missing candidate ownership.");
  const candidateSnap = appRef ? null : await db.collection("candidates").doc(candidateUid).get();
  const candidate = candidateSnap?.exists ? candidateSnap.data() || {} : {};
  const interviewRef = data.id
    ? db.collection(INTERVIEWS_COLLECTION).doc(data.id)
    : db.collection(INTERVIEWS_COLLECTION).doc();
  const interview = {
    id: interviewRef.id,
    application_id: applicationId || "",
    candidate_uid: candidateUid,
    candidate_name: app.full_name || app.candidate_name || candidate.name || data.candidateName || "",
    candidate_email: normalizeEmail(app.email || candidate.email || data.candidateEmail || ""),
    position_title: app.position_title || data.positionTitle || "Tech profile",
    interviewType,
    startsAt,
    meetingLink,
    interviewerName,
    notes,
    status: "scheduled",
    updatedAt: now,
    updatedBy: request.auth.uid,
  };
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(interviewRef);
    transaction.set(interviewRef, {
      ...interview,
      ...(snap.exists ? {} : { createdAt: now, createdBy: request.auth.uid }),
    }, { merge: true });
    const interviewPatch = {
      workflowStage: "technical_interview",
      interviewStatus: "scheduled",
      interview_date: startsAt,
      interviewTime: startsAt,
      meeting_link: meetingLink,
      interviewer: interviewerName,
      updatedAt: now,
      updatedBy: request.auth.uid,
    };
    if (appRef) {
      transaction.set(appRef, {
        ...interviewPatch,
        status: "interview",
        lifecycle_stage: "interview",
      }, { merge: true });
    } else {
      transaction.set(db.collection("candidates").doc(candidateUid), interviewPatch, { merge: true });
    }
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: snap.exists ? "interview_updated" : "interview_scheduled",
      outcome: "success",
      targetCollection: INTERVIEWS_COLLECTION,
      targetId: interviewRef.id,
      after: { applicationId: applicationId || "", candidateUid, startsAt, interviewType },
      createdAt: now,
    });
  });
  await Promise.all([
    queueEmail("interview_scheduled", interview.candidate_email, {
      candidateName: interview.candidate_name || "Candidate",
      positionTitle: interview.position_title || "your application",
      interviewType,
      startsAt,
      interviewerName,
      meetingLink: meetingLink || "To be shared by the hiring team",
      candidatePortalUrl: candidatePortalUrl("/dashboard/applications"),
    }, {
      type: "interview_scheduled",
      entityType: INTERVIEWS_COLLECTION,
      entityId: interviewRef.id,
    }),
    queueEmail("internal_interview_scheduled", OPS_EMAIL, {
      candidateName: interview.candidate_name || "Candidate",
      positionTitle: interview.position_title || "application",
      interviewType,
      startsAt,
      interviewerName,
      meetingLink: meetingLink || "Not set",
      operationsUrl: operationsUrl(`/employee-dashboard/hiring/candidates/${applicationId}`),
    }, {
      type: "internal_interview_scheduled",
      entityType: INTERVIEWS_COLLECTION,
      entityId: interviewRef.id,
    }),
  ]);
  return interview;
});

exports.generateOfferLetter = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }
  const actor = await assertEmployee(request.auth.uid);
  const data = request.data || {};
  const applicationId = requireString(data, "applicationId", "Application ID");
  const roleTitle = requireString(data, "roleTitle", "Role title");
  const startDate = requireString(data, "startDate", "Start date");
  const workLocation = requireString(data, "workLocation", "Work location");
  const consultantType = cleanString(data.consultantType || "Contract", 80);
  const clientName = cleanString(data.clientName || "To be assigned", 160);
  const compensation = actor.role === "admin" ? cleanString(data.compensation || data.rate, 120) : "";
  const notes = cleanString(data.notes, 3000);
  const appRef = db.collection("applications").doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) throw new HttpsError("not-found", "Application was not found.");
  const app = appSnap.data() || {};
  const candidateUid = app.candidate_uid || app.candidateId || app.uid || app.owner_uid;
  if (!candidateUid) throw new HttpsError("failed-precondition", "Application is missing candidate ownership.");
  const candidateName = app.full_name || app.candidate_name || "Candidate";
  const candidateEmail = normalizeEmail(app.email || "");
  const pdf = await renderOfferPdfBuffer({
    candidateName,
    positionTitle: roleTitle,
    consultantType,
    clientName,
    startDate,
    workLocation,
    compensation,
    notes,
  });
  const token = randomUUID();
  const storagePath = `offer-letters/${candidateUid}/${applicationId}/offer-letter.pdf`;
  await bucket.file(storagePath).save(pdf, {
    resumable: false,
    metadata: {
      contentType: "application/pdf",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });
  const fileUrl = storageDownloadUrl(storagePath, token);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const documentRef = db.collection("documents").doc();
  const offerRef = db.collection(OFFER_LETTERS_COLLECTION).doc(applicationId);
  await db.runTransaction(async (transaction) => {
    transaction.set(documentRef, {
      id: documentRef.id,
      owner_uid: candidateUid,
      application_id: applicationId,
      type: "offer_letter",
      title: `Offer letter - ${roleTitle}`,
      file_name: "offer-letter.pdf",
      file_url: fileUrl,
      storage_path: storagePath,
      status: "sent",
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    });
    transaction.set(offerRef, {
      id: offerRef.id,
      application_id: applicationId,
      candidate_uid: candidateUid,
      candidate_email: candidateEmail,
      roleTitle,
      consultantType,
      clientName,
      startDate,
      workLocation,
      compensation: actor.role === "admin" ? compensation : "",
      notes,
      documentId: documentRef.id,
      file_url: fileUrl,
      storage_path: storagePath,
      status: "sent",
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(appRef, {
      status: "offer_sent",
      lifecycle_stage: "offer_sent",
      workflowStage: "hr_contract_review",
      offerLetterDocumentId: documentRef.id,
      offerSentAt: now,
      offerSentBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: "offer_letter_generated",
      outcome: "success",
      targetCollection: "applications",
      targetId: applicationId,
      after: { documentId: documentRef.id, roleTitle },
      createdAt: now,
    });
  });
  await queueEmail("offer_letter_available", candidateEmail, {
    candidateName,
    positionTitle: roleTitle,
    candidatePortalUrl: candidatePortalUrl("/dashboard/applications"),
  }, {
    type: "offer_letter_available",
    entityType: OFFER_LETTERS_COLLECTION,
    entityId: applicationId,
  });
  return { id: documentRef.id, applicationId, file_url: fileUrl, storage_path: storagePath };
});

exports.requestOnboardingDocument = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an employee first.");
  }
  const actor = await assertEmployee(request.auth.uid);
  const data = request.data || {};
  const applicationId = requireString(data, "applicationId", "Application ID");
  const type = cleanString(data.type || "signed_onboarding", 80);
  const title = cleanString(data.title || documentTitle(type), 180);
  const appRef = db.collection("applications").doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) throw new HttpsError("not-found", "Application was not found.");
  const app = appSnap.data() || {};
  const candidateUid = app.candidate_uid || app.candidateId || app.uid || app.owner_uid;
  if (!candidateUid) throw new HttpsError("failed-precondition", "Application is missing candidate ownership.");
  const now = admin.firestore.FieldValue.serverTimestamp();
  const documentRef = db.collection("documents").doc();
  await db.runTransaction(async (transaction) => {
    transaction.set(documentRef, {
      id: documentRef.id,
      owner_uid: candidateUid,
      application_id: applicationId,
      type,
      title,
      status: "requested",
      details: cleanString(data.details, 1000),
      createdAt: now,
      createdBy: request.auth.uid,
      updatedAt: now,
      updatedBy: request.auth.uid,
    });
    transaction.set(db.collection("onboarding").doc(applicationId), {
      id: applicationId,
      application_id: applicationId,
      candidate_uid: candidateUid,
      candidate_name: app.full_name || app.candidate_name || "",
      status: "in_progress",
      tasks: { [REVIEW_TASK_BY_TYPE[type] || type]: "pending" },
      updatedAt: now,
      updatedBy: request.auth.uid,
    }, { merge: true });
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: request.auth.uid,
      actorEmail: actor.email || request.auth.token.email || "",
      action: "onboarding_document_requested",
      outcome: "success",
      targetCollection: "documents",
      targetId: documentRef.id,
      after: { applicationId, type },
      createdAt: now,
    });
  });
  await queueEmail("onboarding_document_requested", normalizeEmail(app.email || ""), {
    candidateName: app.full_name || app.candidate_name || "Candidate",
    documentTitle: title,
    candidatePortalUrl: candidatePortalUrl("/dashboard/applications"),
  }, {
    type: "onboarding_document_requested",
    entityType: "documents",
    entityId: documentRef.id,
  });
  return { id: documentRef.id, type, title };
});

exports.recordCandidateDocumentSubmission = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as a candidate first.");
  }
  const uid = request.auth.uid;
  const data = request.data || {};
  const applicationId = requireString(data, "applicationId", "Application ID");
  const documentId = requireString(data, "documentId", "Document ID");
  const type = cleanString(data.type || "signed_offer", 80);
  const appRef = db.collection("applications").doc(applicationId);
  const docRef = db.collection("documents").doc(documentId);
  const [appSnap, docSnap] = await Promise.all([appRef.get(), docRef.get()]);
  if (!appSnap.exists) throw new HttpsError("not-found", "Application was not found.");
  if (!docSnap.exists) throw new HttpsError("not-found", "Document was not found.");
  const app = appSnap.data() || {};
  const document = docSnap.data() || {};
  if (app.candidate_uid !== uid || document.owner_uid !== uid) {
    throw new HttpsError("permission-denied", "You can only submit documents for your own application.");
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  const reviewRef = db.collection("reviews").doc();
  const title = document.title || documentTitle(type);
  await db.runTransaction(async (transaction) => {
    transaction.set(docRef, {
      type,
      status: "pending_review",
      submittedAt: now,
      updatedAt: now,
      updatedBy: uid,
    }, { merge: true });
    transaction.set(reviewRef, {
      id: reviewRef.id,
      owner_uid: uid,
      candidate_uid: uid,
      application_id: applicationId,
      document_id: documentId,
      type,
      title,
      status: "pending_review",
      details: "Candidate uploaded a signed or onboarding document for review.",
      createdAt: now,
      createdBy: uid,
      updatedAt: now,
      updatedBy: uid,
    });
    transaction.set(db.collection("activityLogs").doc(), {
      actorUid: uid,
      actorEmail: request.auth.token.email || "",
      action: "candidate_document_submitted",
      outcome: "success",
      targetCollection: "documents",
      targetId: documentId,
      after: { applicationId, type },
      createdAt: now,
    });
  });
  await Promise.all([
    queueEmail("signed_document_received", normalizeEmail(app.email || request.auth.token.email || ""), {
      candidateName: app.full_name || app.candidate_name || "Candidate",
      documentTitle: title,
      candidatePortalUrl: candidatePortalUrl("/dashboard/applications"),
    }, {
      type: "signed_document_received",
      entityType: "documents",
      entityId: documentId,
    }),
    queueEmail("internal_signed_document_received", OPS_EMAIL, {
      candidateName: app.full_name || app.candidate_name || "Candidate",
      positionTitle: app.position_title || "application",
      documentTitle: title,
      reviewsUrl: operationsUrl("/employee-dashboard/reviews"),
    }, {
      type: "internal_signed_document_received",
      entityType: "reviews",
      entityId: reviewRef.id,
    }),
  ]);
  return { documentId, reviewId: reviewRef.id, status: "pending_review" };
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
  let relatedApplication = null;

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
        relatedApplication = app;
        if (review.type === "signed_offer" && app.status === "offer_sent") {
          batch.set(appRef, { status: "offer_signed", lifecycle_stage: "offer_signed", updatedAt: now, updatedBy: request.auth.uid }, { merge: true });
          batch.set(db.collection("onboarding").doc(review.application_id), {
            id: review.application_id,
            application_id: review.application_id,
            candidate_uid: review.owner_uid || review.candidate_uid || "",
            candidate_name: app.full_name || app.candidate_name || "",
            status: "in_progress",
            tasks: {
              signed_offer: "approved",
              signed_onboarding: "pending",
              pan: "pending",
              bank: "pending",
              uan: "pending",
              form12bb: "pending",
            },
            updatedAt: now,
            updatedBy: request.auth.uid,
          }, { merge: true });
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
  if (review.owner_uid && REVIEW_RESULT_EMAIL_TYPES.has(review.type)) {
    const [userSnap, consultantSnap] = await Promise.all([
      db.collection("users").doc(review.owner_uid).get().catch(() => null),
      db.collection("consultants").doc(review.owner_uid).get().catch(() => null),
    ]);
    const userData = userSnap?.exists ? userSnap.data() || {} : {};
    const consultantData = consultantSnap?.exists ? consultantSnap.data() || {} : {};
    const to = normalizeEmail(userData.email || consultantData.email || relatedApplication?.email || review.email || "");
    const isConsultantReview = ["bank_details", "pan", "uan"].includes(review.type) || userData.role === "consultant";
    const templateId = isConsultantReview ? "compliance_review_result" : "review_result";
    await queueEmail(templateId, to, {
      candidateName: relatedApplication?.full_name || relatedApplication?.candidate_name || userData.name || "Candidate",
      name: consultantData.name || userData.name || "Consultant",
      documentTitle: review.title || documentTitle(review.type),
      reviewStatus: status.replace(/_/g, " "),
      nextAction: status === "approved"
        ? "No action is required right now."
        : "Please review the request in your portal and upload an updated document if needed.",
      candidatePortalUrl: candidatePortalUrl("/dashboard/applications"),
      consultantPortalUrl: consultantPortalUrl(),
    }, {
      type: templateId,
      entityType: "reviews",
      entityId: reviewId,
    });
    if (review.type === "signed_offer" && status === "approved") {
      await queueEmail("onboarding_started", to, {
        candidateName: relatedApplication?.full_name || relatedApplication?.candidate_name || userData.name || "Candidate",
        candidatePortalUrl: candidatePortalUrl("/dashboard/applications"),
      }, {
        type: "onboarding_started",
        entityType: "onboarding",
        entityId: review.application_id || reviewId,
      });
    }
  }
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
  if (role !== "candidate") {
    const userSnap = await db.collection("users").where("email", "==", email).limit(1).get().catch(() => null);
    const user = userSnap && !userSnap.empty ? userSnap.docs[0].data() || {} : {};
    const portalUrl = role === "consultant" ? consultantPortalUrl() : `${APP_BASE_URL}/employee-login`;
    const templateId = role === "consultant" ? "consultant_access_instructions" : "portal_account_setup";
    await queueEmail(templateId, email, {
      name: user.name || email.split("@")[0],
      email,
      roleLabel: role === "admin" ? "Admin Portal" : role === "employee" ? "Employee Portal" : "Consultant Portal",
      setupLink,
      consultantPortalUrl: consultantPortalUrl(),
      portalUrl,
    }, {
      type: templateId,
      entityType: "users",
      entityId: userSnap && !userSnap.empty ? userSnap.docs[0].id : email,
    });
  }
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

exports.seedEmailTemplates = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in as an admin first.");
  }
  const actor = await assertAdmin(request.auth.uid);
  await seedDefaultEmailTemplates(request.auth.uid);
  await db.collection("activityLogs").add({
    actorUid: request.auth.uid,
    actorEmail: actor.email || request.auth.token.email || "",
    action: "email_templates_seeded",
    outcome: "success",
    targetCollection: EMAIL_TEMPLATES_COLLECTION,
    targetId: "defaults",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { count: Object.keys(DEFAULT_EMAIL_TEMPLATES).length };
});

exports.syncMailDeliveryEvent = onDocumentWritten(
  { document: `${MAIL_COLLECTION}/{mailId}`, region: "us-central1" },
  async (event) => {
    const after = event.data?.after?.exists ? event.data.after.data() || {} : null;
    if (!after) return;
    const before = event.data?.before?.exists ? event.data.before.data() || {} : {};
    const delivery = after.delivery || {};
    const previousDelivery = before.delivery || {};
    const status = emailDeliveryStatus(delivery);
    if (!status) return;
    const previousStatus = emailDeliveryStatus(previousDelivery);
    const errorMessage = delivery.error || delivery.errorMessage || "";
    const previousError = previousDelivery.error || previousDelivery.errorMessage || "";
    if (status === previousStatus && errorMessage === previousError) return;

    const metadata = after.metadata || {};
    const eventId = `mail_${event.params.mailId}_${status}`;
    await db.collection(EMAIL_EVENTS_COLLECTION).doc(eventId).set({
      templateId: metadata.templateId || after.template?.name || "",
      to: Array.isArray(after.to) ? after.to : [after.to].filter(Boolean),
      type: metadata.type || metadata.templateId || "mail_delivery",
      entityType: metadata.entityType || "",
      entityId: metadata.entityId || "",
      status,
      mailId: event.params.mailId,
      delivery,
      error: errorMessage,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
);

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
