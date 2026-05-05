import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, functions, isFirebaseConfigured, storage } from "./firebase";
import {
  COLLECTIONS,
  JOB_STATUSES,
  LEAD_STATUSES,
  ROLES,
  ROLE_VALUES,
} from "./constants";
import { buildSafeCandidateUserData, buildUserPreferencesUpdate, normalizeUserPreferences } from "./validators";
import {
  APPLICATION_LABELS,
  APPLICATION_STAGES,
  APPLICATION_STATUS_VALUES,
  buildConsultantInviteMessage,
  REVIEW_STATUSES,
  assertApplicationTransition,
  getHiringStageMeta,
  getApplicationStatusMeta,
  getMessageReadPatch,
  isCandidateApprovedForConversion,
  normalizeApplicationStatus,
  normalizeHiringStage,
  normalizeMessageData,
  validateHiringStageTransition,
} from "./workflow";

export { APPLICATION_STAGES, JOB_STATUSES };

function requireFirestore() {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured for this deployment.");
  }
}

function requireAuthUser() {
  const user = auth?.currentUser;
  if (!user) throw new Error("Please sign in to continue.");
  return user;
}

function tsValue(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value.seconds) return value.seconds * 1000;
  if (value.toMillis) return value.toMillis();
  return new Date(value).getTime() || 0;
}

function toIso(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate().toISOString();
  if (value.seconds) return new Date(value.seconds * 1000).toISOString();
  if (typeof value === "string") return value;
  return null;
}

function updateMeta(user = auth?.currentUser) {
  return {
    updatedAt: serverTimestamp(),
    ...(user?.uid ? { updatedBy: user.uid } : {}),
  };
}

function createMeta(user = auth?.currentUser) {
  return {
    createdAt: serverTimestamp(),
    ...(user?.uid ? { createdBy: user.uid } : {}),
    ...updateMeta(user),
  };
}

function daysAgoLabel(value) {
  const millis = tsValue(value);
  if (!millis) return "recently";
  const days = Math.max(0, Math.floor((Date.now() - millis) / 86400000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function splitTags(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

const ALLOWED_UPLOAD_EXTENSIONS = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg"]);
const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateUploadFile(file, options = {}) {
  if (!file) throw new Error("Choose a file first.");
  const allowed = options.allowedExtensions || ALLOWED_UPLOAD_EXTENSIONS;
  const maxBytes = options.maxBytes || DEFAULT_MAX_UPLOAD_BYTES;
  const ext = String(file.name || "").split(".").pop().toLowerCase();
  if (!allowed.has(ext)) {
    throw new Error(`Unsupported file type. Upload ${Array.from(allowed).join(", ").toUpperCase()} files only.`);
  }
  if (file.size > maxBytes) {
    throw new Error(`File is too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
}

function candidateUidFrom(application = {}) {
  return application.candidate_uid || application.candidateId || application.uid || application.owner_uid || "";
}

function mapDoc(snap) {
  const data = snap.data() || {};
  return {
    id: data.id || snap.id,
    ...data,
    created_at: toIso(data.created_at || data.createdAt),
    updated_at: toIso(data.updated_at || data.updatedAt),
  };
}

function normalizeJob(job) {
  const tags = splitTags(job.tags);
  return {
    id: job.id,
    title: job.title || "Untitled role",
    department: job.department || "Engineering",
    employment_type: job.employment_type || "Full-time",
    work_mode: job.work_mode || "Remote",
    owner: job.owner || job.jobOwner || "",
    clientName: job.clientName || job.client_name || "",
    priority: job.priority || "Medium",
    hiringType: job.hiringType || job.hiring_type || job.employment_type || "Full-time",
    location: job.location || job.workLocation || job.work_mode || "Remote",
    experience: job.experience || "0-3 yrs exp",
    tags: tags.length ? tags : ["Full-time", "Remote"],
    description: job.description || "",
    status: job.status || "draft",
    created_at: job.created_at,
    updated_at: job.updated_at,
  };
}

function normalizeApplication(app) {
  const status = normalizeApplicationStatus(app.status || app.lifecycle_stage || "applied");
  const meta = getApplicationStatusMeta(status);
  const workflowStage = normalizeHiringStage(app.workflowStage, status);
  const hiringMeta = getHiringStageMeta(workflowStage);
  return {
    ...app,
    id: app.id,
    status,
    status_label: meta.label || APPLICATION_LABELS[status] || status,
    status_next_action: meta.nextAction || "",
    workflowStage,
    workflowStageLabel: hiringMeta.label,
    workflowNextAction: hiringMeta.nextAction,
    position_title: app.position_title || "Open role",
    years_experience: app.years_experience || "",
    applied_ago: app.applied_ago || daysAgoLabel(app.created_at || app.createdAt),
  };
}

function formatMessageTime(value) {
  const iso = toIso(value);
  if (!iso) return "just now";
  return new Date(iso).toLocaleString();
}

function buildMessageThreads(messageDocs, candidateByUid = {}) {
  const threads = new Map();
  messageDocs.forEach((snap) => {
    const candidateUid = (snap.data() || {}).candidate_uid || snap.ref.parent.parent?.id;
    if (!candidateUid) return;
    const data = normalizeMessageData(snap.id, snap.data() || {}, candidateUid);

    const candidate = candidateByUid[candidateUid] || {};
    const current = threads.get(candidateUid);
    const next = {
      candidateUid,
      candidateName:
        candidate.name ||
        data.candidate_name ||
        (data.author === "candidate" ? data.authorName : "") ||
        "Candidate",
      candidateEmail: candidate.email || data.candidate_email || "",
      latestText: data.text || "",
      latestAuthor: data.authorName || "SaturnMax Technologies",
      latestAt: data.createdAt || data.created_at,
      latestAtLabel: formatMessageTime(data.createdAt || data.created_at),
      unreadCount: data.unreadForEmployee ? 1 : 0,
      messageCount: 1,
    };

    if (!current) {
      threads.set(candidateUid, next);
      return;
    }

    threads.set(candidateUid, {
      ...current,
      unreadCount: current.unreadCount + (data.unreadForEmployee ? 1 : 0),
      messageCount: current.messageCount + 1,
    });
  });

  return Array.from(threads.values()).sort(
    (a, b) => tsValue(b.latestAt) - tsValue(a.latestAt)
  );
}

function emptyDashboard(user) {
  return {
    candidate: {
      id: user?.uid || "new",
      uid: user?.uid || "",
      email: user?.email || "",
      emailVerified: Boolean(user?.emailVerified),
      name: user?.name || user?.displayName || "Candidate",
      role_label: "Job Candidate",
      profile_complete_percent: 25,
      profile_checklist: {
        basic_info: Boolean(user?.email),
        work_preference: false,
        portfolio_url: false,
        resume_uploaded: false,
      },
    },
    stats: {
      applications_sent: 0,
      applications_delta_week: 0,
      interviews_scheduled: 0,
      next_interview: null,
      profile_views: 0,
      profile_views_delta_week: 0,
      profile_complete_percent: 25,
    },
    applications: [],
    documents: [],
    activity: [],
    unread_messages: 0,
  };
}

function profilePercent(candidate, docs) {
  const checks = [
    Boolean(candidate?.email),
    Boolean(candidate?.phone),
    Boolean(candidate?.portfolio_url),
    Boolean(candidate?.resume_uploaded || docs.some((d) => d.type === "resume")),
    Boolean(candidate?.primary_skills),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function ensureCandidateUser(user) {
  requireFirestore();
  if (!user?.uid) return;
  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const userSnap = await getDoc(userRef);
  const existingData = userSnap.exists() ? userSnap.data() : null;
  const existingRole = existingData?.role || null;
  const name = user.displayName || user.name || user.email?.split("@")[0] || "Candidate";
  const safeUser = buildSafeCandidateUserData(existingData, {
    email: user.email || "",
    name,
  });

  await setDoc(
    userRef,
    {
      ...safeUser,
      ...(userSnap.exists() ? {} : createMeta({ uid: user.uid })),
      ...updateMeta({ uid: user.uid }),
    },
    { merge: true }
  );

  if (existingRole && existingRole !== "candidate") return;

  await setDoc(
    doc(db, COLLECTIONS.CANDIDATES, user.uid),
    {
      uid: user.uid,
      email: user.email || "",
      name,
      role_label: "Job Candidate",
      ...(userSnap.exists() ? {} : createMeta({ uid: user.uid })),
      ...updateMeta({ uid: user.uid }),
    },
    { merge: true }
  );
}

export async function fetchJobs({ includeAll = false } = {}) {
  if (!isFirebaseConfigured || !db) return [];
  const base = collection(db, COLLECTIONS.JOBS);
  const snap = includeAll
    ? await getDocs(query(base, limit(120)))
    : await getDocs(query(base, where("status", "==", "published")));
  return snap.docs
    .map(mapDoc)
    .map(normalizeJob)
    .sort((a, b) => tsValue(b.createdAt || b.created_at) - tsValue(a.createdAt || a.created_at));
}

export async function saveJob(payload) {
  requireFirestore();
  const user = requireAuthUser();
  const tags = splitTags(payload.tags);
  const body = {
    id: payload.id || "",
    title: payload.title?.trim(),
    department: payload.department?.trim() || "Engineering",
    employment_type: payload.employment_type || "Full-time",
    work_mode: payload.work_mode || "Remote",
    owner: payload.owner?.trim() || "",
    clientName: payload.clientName?.trim() || "",
    priority: payload.priority || "Medium",
    hiringType: payload.hiringType || payload.employment_type || "Full-time",
    location: payload.location?.trim() || payload.work_mode || "Remote",
    experience: payload.experience?.trim() || "0-3 yrs exp",
    tags,
    description: payload.description?.trim(),
    status: payload.status || "draft",
    ...updateMeta(user),
  };
  if (!body.title || !body.description) {
    throw new Error("Add a job title and description.");
  }
  return callRequiredFunction("manageJob", { action: "upsert", job: body });
}

export async function updateJobStatus(jobId, status) {
  requireFirestore();
  requireAuthUser();
  if (!JOB_STATUSES.includes(status)) throw new Error("Invalid job status.");
  return callRequiredFunction("manageJob", { action: "status", jobId, status });
}

export async function deleteJob(jobId) {
  requireFirestore();
  requireAuthUser();
  return callRequiredFunction("manageJob", { action: "archive", jobId });
}

export async function submitApplication(payload) {
  requireFirestore();
  const user = requireAuthUser();
  if (user.emailVerified === false) {
    throw new Error("Please verify your email before applying. Check your inbox for the verification link.");
  }
  if (!payload.full_name || !payload.email || !payload.phone || !payload.position_title) {
    throw new Error("Please complete name, email, phone, and position.");
  }
  const applicationPayload = {
    ...payload,
    email: user.email || payload.email,
  };

  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const userSnap = await getDoc(userRef);
  const existingUser = userSnap.exists() ? userSnap.data() : null;
  if (existingUser?.role && existingUser.role !== ROLES.CANDIDATE) {
    throw new Error("Please use a candidate account to apply for jobs.");
  }

  if (payload.position_id) {
    const duplicateSnap = await getDocs(
      query(
        collection(db, COLLECTIONS.APPLICATIONS),
        where("candidate_uid", "==", user.uid),
        where("position_id", "==", payload.position_id),
        limit(1)
      )
    );
    if (!duplicateSnap.empty) {
      throw new Error("You already applied to this job. Open My Applications to track the existing application.");
    }
  }

  const candidateProfile = {
    uid: user.uid,
    email: applicationPayload.email,
    name: applicationPayload.full_name,
    phone: applicationPayload.phone,
    current_location: applicationPayload.current_location || "",
    current_company: applicationPayload.current_company || "",
    portfolio_url: applicationPayload.portfolio_url || "",
    resume_url: applicationPayload.resume_url || "",
    primary_skills: applicationPayload.primary_skills || "",
    role_label: "Job Candidate",
    ...updateMeta(user),
  };

  await setDoc(
    userRef,
    {
      ...buildSafeCandidateUserData(existingUser, {
        email: applicationPayload.email,
        name: applicationPayload.full_name,
      }),
      ...(userSnap.exists() ? {} : createMeta(user)),
      ...updateMeta(user),
    },
    { merge: true }
  );
  await setDoc(
    doc(db, COLLECTIONS.CANDIDATES, user.uid),
    { ...candidateProfile, ...createMeta(user) },
    { merge: true }
  );

  const appRef = doc(collection(db, COLLECTIONS.APPLICATIONS));
  await setDoc(appRef, {
    id: appRef.id,
    ...applicationPayload,
    candidate_uid: user.uid,
    candidate_name: applicationPayload.full_name,
    status: "applied",
    lifecycle_stage: "applied",
    public_status: "submitted",
    ...createMeta(user),
  });
  return { id: appRef.id, ...applicationPayload, status: "applied" };
}

export async function submitContact(payload) {
  requireFirestore();
  if (!payload.name || !payload.email || !payload.message) {
    throw new Error("Please complete name, email, and message.");
  }
  if (functions) {
    return callRequiredFunction("submitLead", payload);
  }
  const refDoc = doc(collection(db, COLLECTIONS.LEADS));
  await setDoc(refDoc, {
    id: refDoc.id,
    ...payload,
    status: "new",
    leadStatus: "new",
    source: "website",
    consent: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: refDoc.id };
}

export async function updateLeadStatus(leadId, patch = {}) {
  requireFirestore();
  requireAuthUser();
  const nextStatus = patch.status || patch.leadStatus || "new";
  if (!LEAD_STATUSES.includes(nextStatus)) throw new Error("Choose a valid lead status.");
  return callRequiredFunction("manageLead", { leadId, ...patch, status: nextStatus });
}

export async function requestCandidateAccountClosure(message = "") {
  requireFirestore();
  const user = requireAuthUser();
  const refDoc = await addDoc(collection(db, COLLECTIONS.REVIEWS), {
    owner_uid: user.uid,
    type: "account_closure_request",
    title: "Candidate account closure request",
    status: "pending_review",
    details: message || "Candidate requested account deletion or data removal.",
    email: user.email || "",
    ...createMeta(user),
  });
  await setDoc(refDoc, { id: refDoc.id }, { merge: true });
  return { id: refDoc.id };
}

export async function fetchApplications(emailOrUid) {
  if (!isFirebaseConfigured || !db) return [];
  const user = auth?.currentUser;
  const uid = user?.uid || emailOrUid;
  const snap = await getDocs(query(collection(db, COLLECTIONS.APPLICATIONS), where("candidate_uid", "==", uid)));
  return snap.docs
    .map(mapDoc)
    .map(normalizeApplication)
    .sort((a, b) => tsValue(b.createdAt || b.created_at) - tsValue(a.createdAt || a.created_at));
}

export async function fetchDocumentsForOwner(uid) {
  if (!isFirebaseConfigured || !db || !uid) return [];
  const snap = await getDocs(query(collection(db, COLLECTIONS.DOCUMENTS), where("owner_uid", "==", uid)));
  return snap.docs
    .map(mapDoc)
    .sort((a, b) => tsValue(b.createdAt || b.created_at) - tsValue(a.createdAt || a.created_at));
}

export async function fetchDashboard(userArg) {
  if (!isFirebaseConfigured || !db) return emptyDashboard(userArg || {});
  const current = auth?.currentUser;
  const user = typeof userArg === "object" ? userArg : current;
  if (!user?.uid) return emptyDashboard(user || {});

  const [candidateSnap, applications, documents] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.CANDIDATES, user.uid)),
    fetchApplications(user.uid),
    fetchDocumentsForOwner(user.uid),
  ]);
  const candidate = candidateSnap.exists()
    ? { id: candidateSnap.id, ...candidateSnap.data() }
    : emptyDashboard(user).candidate;
  const completion = profilePercent(candidate, documents);
  const interview = applications.find((app) => app.status === "interview");
  const activity = applications.slice(0, 6).map((app) => ({
    id: `activity-${app.id}`,
    title: `${getApplicationStatusMeta(app.status).label}: ${app.position_title}`,
    timestamp_label: app.applied_ago || "recently",
    color: getApplicationStatusMeta(app.status).tone,
  }));

  return {
    candidate: {
      ...candidate,
      uid: user.uid,
      email: candidate.email || user.email,
      emailVerified: Boolean(user.emailVerified),
      name: candidate.name || user.displayName || user.email?.split("@")[0] || "Candidate",
      role_label: candidate.role_label || "Job Candidate",
      profile_complete_percent: completion,
      profile_checklist: {
        basic_info: Boolean(candidate.email || user.email),
        work_preference: Boolean(candidate.preferred_work_mode || candidate.current_location),
        portfolio_url: Boolean(candidate.portfolio_url),
        resume_uploaded: Boolean(candidate.resume_uploaded || documents.some((d) => d.type === "resume")),
      },
    },
    stats: {
      applications_sent: applications.length,
      applications_delta_week: applications.filter((a) => tsValue(a.createdAt || a.created_at) > Date.now() - 7 * 86400000).length,
      interviews_scheduled: applications.filter((a) => a.status === "interview").length,
      next_interview: interview?.interview_date || null,
      profile_views: 0,
      profile_views_delta_week: 0,
      profile_complete_percent: completion,
    },
    applications,
    documents,
    activity,
    unread_messages: 0,
  };
}

export async function uploadTrackedFile({ file, path, ownerUid, applicationId, type, title, status = "uploaded" }) {
  requireFirestore();
  const user = auth?.currentUser;
  if (!storage) throw new Error("Storage is not configured.");
  validateUploadFile(file);
  const fileRef = ref(storage, path);
  const task = uploadBytesResumable(fileRef, file, { contentType: file.type });
  await new Promise((resolve, reject) => {
    task.on("state_changed", undefined, reject, resolve);
  });
  const url = await getDownloadURL(task.snapshot.ref);
  const refDoc = doc(collection(db, COLLECTIONS.DOCUMENTS));
  await setDoc(refDoc, {
    id: refDoc.id,
    owner_uid: ownerUid,
    application_id: applicationId || null,
    type,
    title: title || file.name,
    file_name: file.name,
    file_url: url,
    storage_path: path,
    status,
    ...createMeta(user),
  });
  return { id: refDoc.id, file_url: url, title: title || file.name, type };
}

export async function markResumeUploaded({ file, candidateUid }) {
  const ext = file.name.split(".").pop() || "pdf";
  const uploaded = await uploadTrackedFile({
    file,
    path: `resumes/${candidateUid}/resume.${ext}`,
    ownerUid: candidateUid,
    type: "resume",
    title: "Resume",
    status: "uploaded",
  });
  await setDoc(
    doc(db, COLLECTIONS.CANDIDATES, candidateUid),
    {
      resume_uploaded: true,
      resume_url: uploaded.file_url,
      ...updateMeta(auth?.currentUser),
    },
    { merge: true }
  );
  return uploaded;
}

export async function updateCandidateProfile(profile = {}) {
  requireFirestore();
  const user = requireAuthUser();
  const uid = user.uid;
  const safeProfile = {
    uid,
    email: profile.email || user.email || "",
    name: profile.name || user.displayName || user.email?.split("@")[0] || "Candidate",
    phone: profile.phone || "",
    current_location: profile.current_location || "",
    current_company: profile.current_company || "",
    portfolio_url: profile.portfolio_url || "",
    primary_skills: profile.primary_skills || "",
    preferred_work_mode: profile.preferred_work_mode || "",
    years_experience: profile.years_experience || "",
    notice_period: profile.notice_period || "",
    current_ctc_lpa: profile.current_ctc_lpa || "",
    expected_ctc_lpa: profile.expected_ctc_lpa || "",
    introduction: profile.introduction || "",
    role_label: "Job Candidate",
    ...updateMeta(user),
  };
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTIONS.CANDIDATES, uid), safeProfile, { merge: true });
  batch.set(
    doc(db, COLLECTIONS.USERS, uid),
    {
      email: safeProfile.email,
      name: safeProfile.name,
      phone: safeProfile.phone,
      ...updateMeta(user),
    },
    { merge: true }
  );
  await batch.commit();
  return safeProfile;
}

export async function updateOwnUserProfile(profile = {}) {
  requireFirestore();
  const user = requireAuthUser();
  const role = profile.role || user.role || "";
  const base = {
    email: profile.email || user.email || "",
    name: profile.name || user.displayName || user.email?.split("@")[0] || "",
    phone: profile.phone || "",
    title: profile.title || "",
    department: profile.department || "",
    location: profile.location || "",
    bio: profile.bio || "",
    ...updateMeta(user),
  };
  await setDoc(doc(db, COLLECTIONS.USERS, user.uid), base, { merge: true });
  if (role === ROLES.CONSULTANT) {
    await setDoc(
      doc(db, COLLECTIONS.CONSULTANTS, user.uid),
      {
        uid: user.uid,
        name: base.name,
        email: base.email,
        phone: base.phone,
        title: base.title,
        location: base.location,
        bio: base.bio,
        ...updateMeta(user),
      },
      { merge: true }
    );
  }
  return base;
}

export async function fetchOwnUserProfile(uid = auth?.currentUser?.uid) {
  requireFirestore();
  if (!uid) throw new Error("Please sign in to load profile.");
  const [userSnap, consultantSnap] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.USERS, uid)),
    getDoc(doc(db, COLLECTIONS.CONSULTANTS, uid)).catch(() => null),
  ]);
  return {
    id: uid,
    ...(userSnap?.exists() ? userSnap.data() : {}),
    ...(consultantSnap?.exists?.() ? consultantSnap.data() : {}),
  };
}

export async function fetchOperationsData() {
  requireFirestore();
  const [jobs, apps, usersSnap, candidatesSnap, consultantsSnap, reviewsSnap, docsSnap, leadsSnap, activitySnap] = await Promise.all([
    fetchJobs({ includeAll: true }),
    getDocs(query(collection(db, COLLECTIONS.APPLICATIONS), orderBy("updatedAt", "desc"), limit(150))),
    getDocs(query(collection(db, COLLECTIONS.USERS), limit(250))),
    getDocs(query(collection(db, COLLECTIONS.CANDIDATES), limit(250))),
    getDocs(query(collection(db, COLLECTIONS.CONSULTANTS), limit(250))),
    getDocs(query(collection(db, COLLECTIONS.REVIEWS), orderBy("updatedAt", "desc"), limit(150))),
    getDocs(query(collection(db, COLLECTIONS.DOCUMENTS), orderBy("updatedAt", "desc"), limit(200))),
    getDocs(query(collection(db, COLLECTIONS.LEADS), limit(120))),
    getDocs(query(collection(db, COLLECTIONS.ACTIVITY_LOGS), orderBy("createdAt", "desc"), limit(80))),
  ]);
  const applications = apps.docs.map(mapDoc).map(normalizeApplication);
  const users = usersSnap.docs.map(mapDoc);
  const candidates = candidatesSnap.docs.map(mapDoc);
  const candidateByUid = [...users, ...candidates].reduce((acc, candidate) => {
    acc[candidate.uid || candidate.id] = candidate;
    return acc;
  }, {});
  applications.forEach((application) => {
    if (!application.candidate_uid) return;
    candidateByUid[application.candidate_uid] = {
      ...(candidateByUid[application.candidate_uid] || {}),
      uid: application.candidate_uid,
      name: application.full_name || application.candidate_name,
      email: application.email,
    };
  });
  const messageOwnerUids = Array.from(
    new Set(
      [
        ...candidates.map((candidate) => candidate.uid || candidate.id),
        ...users
          .filter((user) => ["candidate", "consultant"].includes(user.role))
          .map((user) => user.uid || user.id),
        ...applications.map((application) => application.candidate_uid),
      ].filter(Boolean)
    )
  );
  const messageSnaps = await Promise.all(
    messageOwnerUids.map((uid) =>
      getDocs(
        query(
          collection(db, COLLECTIONS.MESSAGES, uid, "thread"),
          orderBy("createdAt", "desc"),
          limit(50)
        )
      )
    )
  );
  let groupMessageDocs = [];
  try {
    const groupSnap = await getDocs(query(collectionGroup(db, "thread"), limit(300)));
    groupMessageDocs = groupSnap.docs;
  } catch (err) {
    console.warn("Could not load fallback message index:", err);
  }
  const messageDocsByPath = [...messageSnaps.flatMap((snap) => snap.docs), ...groupMessageDocs].reduce(
    (acc, snap) => {
      acc.set(snap.ref.path, snap);
      return acc;
    },
    new Map()
  );
  const messageDocs = Array.from(messageDocsByPath.values());
  return {
    jobs,
    applications: applications.sort((a, b) => tsValue(b.createdAt || b.created_at) - tsValue(a.createdAt || a.created_at)),
    users,
    candidates,
    consultants: consultantsSnap.docs.map(mapDoc),
    reviews: reviewsSnap.docs.map(mapDoc),
    documents: docsSnap.docs.map(mapDoc),
    leads: leadsSnap.docs.map(mapDoc),
    activityLogs: activitySnap.docs.map(mapDoc),
    messageThreads: buildMessageThreads(messageDocs, candidateByUid),
  };
}

export async function fetchOperationsPage({ collectionName, pageSize = 25, cursor = null, orderField = "updatedAt" }) {
  requireFirestore();
  const constraints = [orderBy(orderField, "desc"), limit(pageSize)];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));
  const snap = await getDocs(query(collection(db, collectionName), ...constraints));
  return {
    items: snap.docs.map(mapDoc),
    cursor: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
}

export async function updateApplicationStatus(application, status, context = {}) {
  requireFirestore();
  requireAuthUser();
  if (!APPLICATION_STATUS_VALUES.includes(normalizeApplicationStatus(status))) {
    throw new Error("Invalid application status.");
  }
  let transition;
  try {
    transition = assertApplicationTransition(application.status || application.lifecycle_stage, status, {
      ...context,
      application,
    });
  } catch (err) {
    await safeRecordActivityLog({
      action: "application_status_transition",
      outcome: "blocked",
      targetCollection: COLLECTIONS.APPLICATIONS,
      targetId: application.id,
      before: { status: normalizeApplicationStatus(application.status || application.lifecycle_stage) },
      after: { status: normalizeApplicationStatus(status) },
      reason: err?.message || "Transition blocked",
    });
    throw err;
  }
  return callRequiredFunction("updateHiringWorkflow", {
    action: "application_status",
    applicationId: application.id,
    status: transition.to,
  });
}

export async function moveHiringStage(application, nextStage, options = {}) {
  requireFirestore();
  requireAuthUser();
  const currentStage = normalizeHiringStage(
    application.workflowStage,
    application.status || application.lifecycle_stage
  );
  const validation = validateHiringStageTransition(currentStage, nextStage, options);
  if (!validation.ok) {
    await safeRecordActivityLog({
      action: "hiring_stage_transition",
      outcome: "blocked",
      targetCollection: COLLECTIONS.APPLICATIONS,
      targetId: application.id,
      before: { workflowStage: validation.from },
      after: { workflowStage: validation.to },
      reason: validation.reason,
    });
    throw new Error(`${validation.reason} ${validation.nextAction}`.trim());
  }
  return callRequiredFunction("updateHiringWorkflow", {
    action: "move_stage",
    applicationId: application.id,
    nextStage: validation.to,
    allowJump: Boolean(options.allowJump),
  });
}

export async function addInterviewReview({ application, stage, rating, recommendation, notes }) {
  requireFirestore();
  requireAuthUser();
  const uid = candidateUidFrom(application);
  if (!uid || !application?.id) throw new Error("Choose a candidate application first.");
  if (!notes?.trim()) throw new Error("Add interview review notes.");
  if (!rating) throw new Error("Choose a review rating.");
  return callRequiredFunction("updateHiringWorkflow", {
    action: "interview_review",
    applicationId: application.id,
    candidateUid: uid,
    stage: normalizeHiringStage(stage || application.workflowStage, application.status),
    rating,
    recommendation: recommendation || "continue",
    notes: notes.trim(),
  });
}

export async function decideCandidate(application, decision, reason = "") {
  requireFirestore();
  requireAuthUser();
  const uid = candidateUidFrom(application);
  if (!uid || !application?.id) throw new Error("Choose a candidate application first.");
  if (!["approved", "rejected"].includes(decision)) throw new Error("Choose approve or reject.");
  if (decision === "rejected" && !reason.trim()) throw new Error("Add a rejection reason.");
  return callRequiredFunction("updateHiringWorkflow", {
    action: decision === "approved" ? "approve" : "reject",
    applicationId: application.id,
    candidateUid: uid,
    reason: reason.trim(),
  });
}

export async function assignCandidate(application, assignedEmployeeId = "") {
  requireFirestore();
  const user = requireAuthUser();
  const uid = candidateUidFrom(application);
  if (!application?.id && !uid) throw new Error("Choose a candidate first.");
  return callRequiredFunction("updateHiringWorkflow", {
    action: "assign",
    applicationId: application.id,
    candidateUid: uid,
    assignedEmployeeId: assignedEmployeeId || user.uid,
  });
}

export async function sendOfferLetter(application, file) {
  const ext = file.name.split(".").pop() || "pdf";
  const uploaded = await uploadTrackedFile({
    file,
    path: `offer-letters/${application.candidate_uid}/${application.id}/offer-letter.${ext}`,
    ownerUid: application.candidate_uid,
    applicationId: application.id,
    type: "offer_letter",
    title: `Offer letter - ${application.position_title}`,
    status: "sent",
  });
  await updateApplicationStatus(application, "offer_sent");
  return uploaded;
}

export async function uploadOnboardingDocument(application, file, docType = "onboarding") {
  const ext = file.name.split(".").pop() || "pdf";
  return uploadTrackedFile({
    file,
    path: `onboarding-documents/${application.candidate_uid}/${application.id}/${docType}.${ext}`,
    ownerUid: application.candidate_uid,
    applicationId: application.id,
    type: docType,
    title: docType.replace(/_/g, " "),
    status: "requested",
  });
}

export async function uploadSignedCandidateDocument(application, file, type = "signed_offer") {
  const user = requireAuthUser();
  const ext = file.name.split(".").pop() || "pdf";
  const folder = type === "signed_offer" ? "signed-offers" : "onboarding-documents";
  const readableType = String(type || "document").replace(/_/g, " ");
  const uploaded = await uploadTrackedFile({
    file,
    path: `${folder}/${user.uid}/${application.id}/${type}.${ext}`,
    ownerUid: user.uid,
    applicationId: application.id,
    type,
    title: type === "signed_offer" ? "Signed offer letter" : `Signed ${readableType}`,
    status: "pending_review",
  });
  await updateApplicationStatus(application, type === "signed_offer" ? "offer_signed" : "onboarding");
  await createReview({
    owner_uid: user.uid,
    application_id: application.id,
    type,
    title: uploaded.title || "Document review",
    status: "pending_review",
    details: "Candidate uploaded a signed document for review.",
  });
  return uploaded;
}

async function safeRecordActivityLog(payload) {
  if (!isFirebaseConfigured || !db || !auth?.currentUser?.uid) return;
  const actor = auth.currentUser;
  try {
    await addDoc(collection(db, COLLECTIONS.ACTIVITY_LOGS), {
      actorUid: actor.uid,
      actorEmail: actor.email || "",
      actorRole: actor.role || "",
      createdAt: serverTimestamp(),
      ...payload,
    });
  } catch (err) {
    console.warn("Could not record activity log:", err);
  }
}

export async function createReview(payload) {
  requireFirestore();
  const user = auth?.currentUser;
  const refDoc = doc(collection(db, COLLECTIONS.REVIEWS));
  await setDoc(refDoc, {
    id: refDoc.id,
    ...payload,
    status: payload.status || "pending_review",
    ...createMeta(user),
  });
  return { id: refDoc.id };
}

export async function updateReviewStatus(reviewId, status) {
  requireFirestore();
  requireAuthUser();
  if (!REVIEW_STATUSES.includes(status)) throw new Error("Invalid review status.");
  return callRequiredFunction("resolveReviewDecision", { reviewId, status });
}

export async function resolveReview(review, status) {
  requireFirestore();
  requireAuthUser();
  if (!REVIEW_STATUSES.includes(status)) throw new Error("Invalid review status.");
  return callRequiredFunction("resolveReviewDecision", { reviewId: review.id, status });
}

export async function updateConsultantProfile(uid, profile) {
  requireFirestore();
  const user = requireAuthUser();
  await setDoc(
    doc(db, COLLECTIONS.CONSULTANTS, uid),
    {
      ...profile,
      uid,
      ...updateMeta(user),
    },
    { merge: true }
  );
}

export async function convertToConsultant(application, profile = {}, context = {}) {
  requireFirestore();
  const user = requireAuthUser();
  if (!functions) {
    throw new Error("Consultant conversion requires Firebase Cloud Functions. Deploy convertCandidateToConsultant first.");
  }
  const uid = candidateUidFrom(application);
  if (!uid) throw new Error("Application is missing candidate UID.");
  const email = normalizeEmail(profile.email || application.email);
  if (!isValidEmail(email)) throw new Error("Candidate email is required before conversion.");
  if (!profile.consultantType) throw new Error("Choose a consultant type.");
  if (!profile.roleTitle) throw new Error("Add a consultant role title.");
  if (!profile.startDate) throw new Error("Add a consultant start date.");
  if (!profile.workLocation) throw new Error("Add a work location.");

  if (!isCandidateApprovedForConversion({}, application) && context.overrideApproved && !context.overrideReason?.trim()) {
    throw new Error("Add an override reason before converting this candidate.");
  }

  const callable = httpsCallable(functions, "convertCandidateToConsultant");
  const response = await callable({
    applicationId: application.id,
    profile: {
      ...profile,
      email,
    },
    overrideApproved: Boolean(context.overrideApproved),
    overrideReason: context.overrideReason || "",
  });
  const consultant = response.data?.consultant || {
    uid: response.data?.uid || uid,
    email: response.data?.email || email,
    name: response.data?.name || profile.name || application.full_name || application.candidate_name || "Consultant",
  };
  let emailSent = false;
  try {
    await sendConsultantPasswordInvite(consultant.email);
    await markConsultantInvitationSent(uid, consultant.email);
    await Promise.all([
      updateDoc(doc(db, COLLECTIONS.APPLICATIONS, application.id), {
        workflowStage: "credentials_sent",
        credentialsSentAt: serverTimestamp(),
        credentialsSentByEmployeeId: user.uid,
        ...updateMeta(user),
      }),
      setDoc(doc(db, COLLECTIONS.CANDIDATES, uid), {
        workflowStage: "credentials_sent",
        credentialsSentAt: serverTimestamp(),
        credentialsSentByEmployeeId: user.uid,
        ...updateMeta(user),
      }, { merge: true }),
    ]);
    emailSent = true;
  } catch (err) {
    console.warn("Consultant conversion invite email failed:", err);
    await safeRecordActivityLog({
      action: "consultant_conversion_invite_failed",
      outcome: "blocked",
      targetCollection: COLLECTIONS.CONSULTANTS,
      targetId: uid,
      reason: err?.message || "Password setup email failed",
    });
  }

  return {
    consultant,
    emailSent,
    invite: buildConsultantInviteMessage({
      name: consultant.name,
      email: consultant.email,
      consultantLoginUrl: "https://saturnmax.com/consultant-login",
    }),
  };
}

function validateConsultantProfileInput(payload = {}) {
  const required = [
    ["fullName", "Full name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["roleTitle", "Role title"],
    ["consultantType", "Consultant type"],
    ["startDate", "Start date"],
    ["workLocation", "Work location"],
  ];
  const missing = required.find(([key]) => !String(payload[key] || "").trim());
  if (missing) throw new Error(`${missing[1]} is required.`);
  if (!isValidEmail(payload.email)) throw new Error("Enter a valid consultant email.");
}

function callableInviteUnavailable(error) {
  const code = String(error?.code || "");
  return [
    "functions/not-found",
    "functions/unavailable",
    "functions/internal",
    "unavailable",
    "not-found",
  ].includes(code);
}

function callableAdminUnavailable(error) {
  return callableInviteUnavailable(error);
}

async function callRequiredFunction(name, payload = {}) {
  if (!functions) {
    throw new Error(`Firebase Cloud Function ${name} is required for this action. Deploy functions and try again.`);
  }
  const callable = httpsCallable(functions, name);
  try {
    const response = await callable(payload);
    return response.data || {};
  } catch (err) {
    if (callableInviteUnavailable(err)) {
      throw new Error(`Firebase Cloud Function ${name} is not available yet. Deploy functions and try again.`);
    }
    throw err;
  }
}

async function createManualConsultantWithFunction(payload) {
  if (!functions || payload.useCloudFunction === false) {
    throw new Error("Consultant invitations require Firebase Cloud Functions. Deploy createManualConsultantInvite first.");
  }
  const callable = httpsCallable(functions, "createManualConsultantInvite");
  try {
    const response = await callable(payload);
    return response.data || null;
  } catch (err) {
    if (callableInviteUnavailable(err)) {
      throw new Error("Consultant invite function is not available yet. Deploy createManualConsultantInvite and try again.");
    }
    throw err;
  }
}

export async function sendConsultantPasswordInvite(email) {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const address = normalizeEmail(email);
  if (!isValidEmail(address)) throw new Error("Enter a valid consultant email.");
  await callRequiredFunction("sendPortalPasswordSetup", {
    email: address,
    role: ROLES.CONSULTANT,
    url: "https://saturnmax.com/consultant-login",
  });
  await sendPasswordResetEmail(auth, address, {
    url: "https://saturnmax.com/consultant-login",
    handleCodeInApp: false,
  });
}

export async function markConsultantInvitationSent(uid, email) {
  requireFirestore();
  const user = requireAuthUser();
  if (!uid) return;
  const batch = writeBatch(db);
  batch.set(
    doc(db, COLLECTIONS.CONSULTANTS, uid),
    {
      credentialsStatus: "sent",
      credentialsSentAt: serverTimestamp(),
      credentialsSentByEmployeeId: user.uid,
      loginEnabled: true,
      loginSetupRequired: false,
      ...updateMeta(user),
    },
    { merge: true }
  );
  batch.set(doc(collection(db, COLLECTIONS.ACTIVITY_LOGS)), {
    actorUid: user.uid,
    actorEmail: user.email || "",
    action: "consultant_invitation_email_sent",
    outcome: "success",
    targetCollection: COLLECTIONS.CONSULTANTS,
    targetId: uid,
    after: { email: normalizeEmail(email), credentialsStatus: "sent" },
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function manuallyAddConsultant(payload = {}) {
  requireFirestore();
  requireAuthUser();
  validateConsultantProfileInput(payload);
  const email = normalizeEmail(payload.email);

  const functionResult = await createManualConsultantWithFunction({ ...payload, email });
  if (functionResult?.uid && functionResult?.email) {
    let emailSent = false;
    if (payload.sendInvitationEmail) {
      await sendConsultantPasswordInvite(functionResult.email);
      await markConsultantInvitationSent(functionResult.uid, functionResult.email);
      emailSent = true;
    }
    return {
      consultant: {
        uid: functionResult.uid,
        email: functionResult.email,
        name: functionResult.name,
        loginEnabled: true,
        credentialsStatus: emailSent ? "sent" : "invite_pending_send",
      },
      loginSetupRequired: false,
      emailSent,
      authUserCreated: Boolean(functionResult.authUserCreated),
      invite: buildConsultantInviteMessage({
        name: functionResult.name,
        email: functionResult.email,
        consultantLoginUrl: "https://saturnmax.com/consultant-login",
      }),
    };
  }

  throw new Error("Consultant invite function did not return a consultant record.");
}

export async function adminSendPasswordReset(email, url = "https://saturnmax.com/login", role = ROLES.CANDIDATE) {
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const address = normalizeEmail(email);
  if (!isValidEmail(address)) throw new Error("Enter a valid email.");
  if (role !== ROLES.CANDIDATE) {
    await callRequiredFunction("sendPortalPasswordSetup", { email: address, role, url });
  }
  await sendPasswordResetEmail(auth, address, {
    url,
    handleCodeInApp: false,
  });
}

async function adminUpsertPortalUserWithFunction(payload) {
  if (!functions || payload.useCloudFunction === false) {
    throw new Error("Admin account management requires Firebase Cloud Functions. Deploy adminUpsertPortalUser first.");
  }
  const callable = httpsCallable(functions, "adminUpsertPortalUser");
  try {
    const response = await callable(payload);
    return response.data || null;
  } catch (err) {
    if (callableAdminUnavailable(err)) {
      throw new Error("Admin account function is not available yet. Deploy adminUpsertPortalUser and try again.");
    }
    throw err;
  }
}

export async function adminUpsertPortalUser(payload = {}) {
  requireFirestore();
  requireAuthUser();
  const email = normalizeEmail(payload.email);
  const role = payload.role || ROLES.CANDIDATE;
  if (!isValidEmail(email)) throw new Error("Enter a valid email.");
  if (!ROLE_VALUES.includes(role)) throw new Error("Choose a valid role.");
  if (!payload.name?.trim()) throw new Error("Full name is required.");

  const functionResult = await adminUpsertPortalUserWithFunction({ ...payload, email, role });
  if (functionResult?.uid) {
    if (payload.sendReset) {
      await adminSendPasswordReset(email, portalResetUrl(role), role);
    }
    return { ...functionResult, functionBacked: true };
  }
  throw new Error("Admin account function did not return a user record.");
}

function portalResetUrl(role) {
  if (role === ROLES.CONSULTANT) return "https://saturnmax.com/consultant-login";
  if (role === ROLES.EMPLOYEE || role === ROLES.ADMIN) return "https://saturnmax.com/employee-login";
  return "https://saturnmax.com/login";
}

export async function adminDeactivatePortalUser(target = {}) {
  requireFirestore();
  requireAuthUser();
  if (!target.uid) throw new Error("Choose a user first.");
  if (!functions) {
    throw new Error("Account deactivation requires Firebase Cloud Functions. Deploy adminDeactivatePortalUser first.");
  }
  const callable = httpsCallable(functions, "adminDeactivatePortalUser");
  try {
    await callable({ uid: target.uid, disabled: true });
  } catch (err) {
    if (callableAdminUnavailable(err)) {
      throw new Error("Admin deactivate function is not available yet. Deploy adminDeactivatePortalUser and try again.");
    }
    throw err;
  }
}

export async function fetchConsultantDashboard(uid) {
  requireFirestore();
  const [consultantSnap, documents, reviewsSnap] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.CONSULTANTS, uid)),
    fetchDocumentsForOwner(uid),
    getDocs(query(collection(db, COLLECTIONS.REVIEWS), where("owner_uid", "==", uid))),
  ]);
  const consultant = consultantSnap.exists()
    ? { id: consultantSnap.id, ...consultantSnap.data() }
    : {
        uid,
        name: auth?.currentUser?.displayName || auth?.currentUser?.email?.split("@")[0] || "Consultant",
        email: auth?.currentUser?.email || "",
        consultantId: "Pending",
        role: "Consultant",
        client: "Pending assignment",
        project: "Pending assignment",
        status: "Profile setup",
      };
  return {
    consultant,
    documents,
    reviews: reviewsSnap.docs.map(mapDoc),
  };
}

export async function submitBankReview(details) {
  requireFirestore();
  const user = requireAuthUser();
  await setDoc(
    doc(db, COLLECTIONS.CONSULTANTS, user.uid),
    {
      bankDetails: {
        account_holder: details.account_holder || "",
        bank_name: details.bank_name || "",
        account_number_last4: String(details.account_number || "").slice(-4),
        ifsc: details.ifsc || "",
        status: "pending_review",
        updatedAt: serverTimestamp(),
      },
      bankStatus: "pending_review",
      ...updateMeta(user),
    },
    { merge: true }
  );
  return createReview({
    owner_uid: user.uid,
    consultant_uid: user.uid,
    type: "bank_details",
    title: "Bank account details",
    status: "pending_review",
    details: `Bank: ${details.bank_name || "Not provided"} / IFSC: ${details.ifsc || "Not provided"}`,
  });
}

export async function sendConsultantSupportRequest({ category = "general", message = "" } = {}) {
  requireFirestore();
  const user = requireAuthUser();
  const body = message.trim();
  if (!body) throw new Error("Enter a support message.");
  return createReview({
    owner_uid: user.uid,
    consultant_uid: user.uid,
    type: "consultant_support",
    title: `Consultant support: ${String(category || "general").replace(/_/g, " ")}`,
    status: "pending_review",
    details: body,
    category,
    email: user.email || "",
  });
}

export async function fetchMessageThread(candidateUid) {
  requireFirestore();
  if (!candidateUid) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.MESSAGES, candidateUid, "thread"), orderBy("createdAt", "asc"), limit(200))
  );
  return snap.docs.map((item) => {
    const data = normalizeMessageData(item.id, mapDoc(item), candidateUid);
    return {
      ...data,
      time: formatMessageTime(data.createdAt || data.created_at),
    };
  });
}

async function markThreadRead(candidateUid, viewer) {
  requireFirestore();
  const user = requireAuthUser();
  if (!candidateUid) return;
  const unreadField = viewer === "candidate" ? "unreadForCandidate" : "unreadForEmployee";
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.MESSAGES, candidateUid, "thread"),
      where(unreadField, "==", true),
      limit(200)
    )
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((item) => {
    batch.update(item.ref, getMessageReadPatch(viewer, user.uid, serverTimestamp()));
  });
  await batch.commit();
}

export async function markCandidateThreadRead(candidateUid) {
  return markThreadRead(candidateUid, "candidate");
}

export async function markEmployeeThreadRead(candidateUid) {
  return markThreadRead(candidateUid, "employee");
}

export function mapMessageForUi(id, data, candidateUid = "") {
  return {
    ...normalizeMessageData(id, data, candidateUid),
    time: formatMessageTime(data?.createdAt || data?.created_at),
  };
}

export async function sendCandidateMessage({ text, user }) {
  requireFirestore();
  const current = requireAuthUser();
  const body = text?.trim();
  if (!body) throw new Error("Enter a message.");
  await ensureCandidateUser({
    uid: current.uid,
    email: current.email || user?.email,
    displayName: current.displayName,
    name: user?.name,
  });
  await addDoc(collection(db, COLLECTIONS.MESSAGES, current.uid, "thread"), {
    author: "candidate",
    authorRole: "candidate",
    authorName: user?.name || current.displayName || current.email?.split("@")[0] || "Candidate",
    candidate_uid: current.uid,
    candidate_email: current.email || user?.email || "",
    text: body,
    unreadForEmployee: true,
    unreadForCandidate: false,
    ...createMeta(current),
  });
}

export async function sendHiringMessage({ candidateUid, text, employee }) {
  requireFirestore();
  const current = requireAuthUser();
  const body = text?.trim();
  if (!candidateUid) throw new Error("Choose a candidate thread.");
  if (!body) throw new Error("Enter a reply.");
  await addDoc(collection(db, COLLECTIONS.MESSAGES, candidateUid, "thread"), {
    author: "employee",
    authorRole: "hiring_team",
    authorName:
      employee?.name ||
      current.displayName ||
      current.email?.split("@")[0] ||
      "SaturnMax Technologies hiring team",
    candidate_uid: candidateUid,
    text: body,
    unreadForEmployee: false,
    unreadForCandidate: true,
    ...createMeta(current),
  });
}

export async function fetchUserPreferences(uid = auth?.currentUser?.uid) {
  requireFirestore();
  if (!uid) throw new Error("Please sign in to load settings.");
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return normalizeUserPreferences(snap.exists() ? snap.data() : {});
}

export async function saveUserPreferences(nextPreferences) {
  requireFirestore();
  const user = requireAuthUser();
  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const snap = await getDoc(userRef);
  const update = buildUserPreferencesUpdate(snap.exists() ? snap.data() : {}, nextPreferences);
  await setDoc(
    userRef,
    {
      ...update,
      ...updateMeta(user),
    },
    { merge: true }
  );
  return update;
}

export async function recordLoginEvent(session) {
  if (!isFirebaseConfigured || !db) return;
  await addDoc(collection(db, COLLECTIONS.LOGIN_EVENTS), {
    ...session,
    createdAt: serverTimestamp(),
  });
}
