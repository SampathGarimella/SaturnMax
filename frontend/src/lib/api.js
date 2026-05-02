import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, isFirebaseConfigured, storage } from "./firebase";
import {
  COLLECTIONS,
  JOB_STATUSES,
  ROLES,
} from "./constants";
import { buildSafeCandidateUserData, buildUserPreferencesUpdate, normalizeUserPreferences } from "./validators";
import {
  APPLICATION_LABELS,
  APPLICATION_STAGES,
  APPLICATION_STATUS_VALUES,
  REVIEW_STATUSES,
  assertApplicationTransition,
  getApplicationStatusMeta,
  getMessageReadPatch,
  normalizeApplicationStatus,
  normalizeMessageData,
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
  return {
    ...app,
    id: app.id,
    status,
    status_label: meta.label || APPLICATION_LABELS[status] || status,
    status_next_action: meta.nextAction || "",
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
      latestAuthor: data.authorName || "SaturnMax Technologies Pvt Ltd",
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
    ? await getDocs(base)
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
    title: payload.title?.trim(),
    department: payload.department?.trim() || "Engineering",
    employment_type: payload.employment_type || "Full-time",
    work_mode: payload.work_mode || "Remote",
    experience: payload.experience?.trim() || "0-3 yrs exp",
    tags,
    description: payload.description?.trim(),
    status: payload.status || "draft",
    ...updateMeta(user),
  };
  if (!body.title || !body.description) {
    throw new Error("Add a job title and description.");
  }
  if (payload.id) {
    await updateDoc(doc(db, COLLECTIONS.JOBS, payload.id), body);
    return { id: payload.id, ...body };
  }
  const refDoc = await addDoc(collection(db, COLLECTIONS.JOBS), {
    ...body,
    ...createMeta(user),
  });
  await setDoc(refDoc, { id: refDoc.id }, { merge: true });
  return { id: refDoc.id, ...body };
}

export async function updateJobStatus(jobId, status) {
  requireFirestore();
  const user = requireAuthUser();
  if (!JOB_STATUSES.includes(status)) throw new Error("Invalid job status.");
  await updateDoc(doc(db, COLLECTIONS.JOBS, jobId), {
    status,
    ...updateMeta(user),
  });
}

export async function deleteJob(jobId) {
  requireFirestore();
  await deleteDoc(doc(db, COLLECTIONS.JOBS, jobId));
}

export async function submitApplication(payload) {
  requireFirestore();
  const user = requireAuthUser();
  if (!payload.full_name || !payload.email || !payload.phone || !payload.position_title) {
    throw new Error("Please complete name, email, phone, and position.");
  }

  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const userSnap = await getDoc(userRef);
  const existingUser = userSnap.exists() ? userSnap.data() : null;
  if (existingUser?.role && existingUser.role !== ROLES.CANDIDATE) {
    throw new Error("Please use a candidate account to apply for jobs.");
  }

  const candidateProfile = {
    uid: user.uid,
    email: payload.email,
    name: payload.full_name,
    phone: payload.phone,
    current_location: payload.current_location || "",
    current_company: payload.current_company || "",
    portfolio_url: payload.portfolio_url || "",
    resume_url: payload.resume_url || "",
    primary_skills: payload.primary_skills || "",
    role_label: "Job Candidate",
    ...updateMeta(user),
  };

  await setDoc(
    doc(db, COLLECTIONS.CANDIDATES, user.uid),
    { ...candidateProfile, ...createMeta(user) },
    { merge: true }
  );
  await setDoc(
    userRef,
    {
      ...buildSafeCandidateUserData(existingUser, {
        email: payload.email,
        name: payload.full_name,
      }),
      ...(userSnap.exists() ? {} : createMeta(user)),
      ...updateMeta(user),
    },
    { merge: true }
  );

  const appRef = await addDoc(collection(db, COLLECTIONS.APPLICATIONS), {
    ...payload,
    candidate_uid: user.uid,
    candidate_name: payload.full_name,
    status: "applied",
    lifecycle_stage: "applied",
    ...createMeta(user),
  });
  await setDoc(appRef, { id: appRef.id }, { merge: true });
  return { id: appRef.id, ...payload, status: "applied" };
}

export async function submitContact(payload) {
  requireFirestore();
  if (!payload.name || !payload.email || !payload.message) {
    throw new Error("Please complete name, email, and message.");
  }
  const refDoc = await addDoc(collection(db, COLLECTIONS.LEADS), {
    ...payload,
    status: "new",
    source: "website",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
  if (!file) throw new Error("Choose a file first.");
  const fileRef = ref(storage, path);
  const task = uploadBytesResumable(fileRef, file, { contentType: file.type });
  await new Promise((resolve, reject) => {
    task.on("state_changed", undefined, reject, resolve);
  });
  const url = await getDownloadURL(task.snapshot.ref);
  const refDoc = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), {
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
  await setDoc(refDoc, { id: refDoc.id }, { merge: true });
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

export async function fetchOperationsData() {
  requireFirestore();
  const [jobs, apps, usersSnap, candidatesSnap, consultantsSnap, reviewsSnap, docsSnap, leadsSnap] = await Promise.all([
    fetchJobs({ includeAll: true }),
    getDocs(collection(db, COLLECTIONS.APPLICATIONS)),
    getDocs(collection(db, COLLECTIONS.USERS)),
    getDocs(collection(db, COLLECTIONS.CANDIDATES)),
    getDocs(collection(db, COLLECTIONS.CONSULTANTS)),
    getDocs(collection(db, COLLECTIONS.REVIEWS)),
    getDocs(collection(db, COLLECTIONS.DOCUMENTS)),
    getDocs(collection(db, COLLECTIONS.LEADS)),
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
    messageThreads: buildMessageThreads(messageDocs, candidateByUid),
  };
}

export async function updateApplicationStatus(application, status, context = {}) {
  requireFirestore();
  const user = requireAuthUser();
  if (!APPLICATION_STATUS_VALUES.includes(normalizeApplicationStatus(status))) {
    throw new Error("Invalid application status.");
  }
  const transition = assertApplicationTransition(application.status || application.lifecycle_stage, status, {
    ...context,
    application,
  });
  const nextStatus = transition.to;
  await updateDoc(doc(db, COLLECTIONS.APPLICATIONS, application.id), {
    status: nextStatus,
    lifecycle_stage: nextStatus,
    ...updateMeta(user),
  });
  if (nextStatus === "onboarding") {
    const onboardingRef = doc(db, COLLECTIONS.ONBOARDING, application.id);
    const onboardingSnap = await getDoc(onboardingRef);
    await setDoc(
      onboardingRef,
      {
        id: application.id,
        application_id: application.id,
        candidate_uid: application.candidate_uid,
        candidate_name: application.full_name || application.candidate_name,
        status: "in_progress",
        tasks: {
          offer_letter: "pending",
          signed_offer: "pending",
          pan: "pending",
          bank: "pending",
          uan: "pending",
          form12bb: "pending",
        },
        ...(onboardingSnap.exists() ? {} : createMeta(user)),
        ...updateMeta(user),
      },
      { merge: true }
    );
  }
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

function reviewDocumentTypes(review) {
  return REVIEW_DOCUMENT_TYPES[review?.type] || [review?.type].filter(Boolean);
}

async function updateDocumentsForReview(review, status, actor) {
  const types = reviewDocumentTypes(review);
  if (!review?.owner_uid || types.length === 0) return;
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.DOCUMENTS), where("owner_uid", "==", review.owner_uid))
  );
  const batch = writeBatch(db);
  let changed = 0;
  snap.docs.forEach((item) => {
    const data = item.data() || {};
    if (review.application_id && data.application_id && data.application_id !== review.application_id) {
      return;
    }
    if (!types.includes(data.type)) return;
    batch.update(item.ref, {
      status: reviewDocumentStatus(status),
      reviewedAt: serverTimestamp(),
      reviewedBy: actor.uid,
      ...updateMeta(actor),
    });
    changed += 1;
  });
  if (changed > 0) await batch.commit();
}

async function updateOnboardingForReview(review, status, actor) {
  if (!review?.application_id) return;
  const task = REVIEW_TASK_BY_TYPE[review.type];
  if (!task) return;
  const onboardingRef = doc(db, COLLECTIONS.ONBOARDING, review.application_id);
  await setDoc(
    onboardingRef,
    {
      id: review.application_id,
      application_id: review.application_id,
      candidate_uid: review.owner_uid || review.candidate_uid || "",
      status: status === "approved" ? "under_review" : "in_progress",
      tasks: {
        [task]: reviewTaskStatus(status),
      },
      ...updateMeta(actor),
    },
    { merge: true }
  );
}

async function updateApplicationForReview(review, status) {
  if (status !== "approved" || !review?.application_id) return;
  const applicationSnap = await getDoc(doc(db, COLLECTIONS.APPLICATIONS, review.application_id));
  if (!applicationSnap.exists()) return;
  const application = normalizeApplication(mapDoc(applicationSnap));
  if (review.type === "signed_offer" && application.status === "offer_sent") {
    await updateApplicationStatus(application, "offer_signed", { documents: [], reviews: [] });
  }
  if (
    ["signed_onboarding", "onboarding_pack", "onboarding", "form12bb"].includes(review.type) &&
    application.status === "offer_signed"
  ) {
    await updateApplicationStatus(application, "onboarding", { documents: [], reviews: [] });
  }
}

export async function createReview(payload) {
  requireFirestore();
  const user = auth?.currentUser;
  const refDoc = await addDoc(collection(db, COLLECTIONS.REVIEWS), {
    ...payload,
    status: payload.status || "pending_review",
    ...createMeta(user),
  });
  await setDoc(refDoc, { id: refDoc.id }, { merge: true });
  return { id: refDoc.id };
}

export async function updateReviewStatus(reviewId, status) {
  requireFirestore();
  const user = requireAuthUser();
  if (!REVIEW_STATUSES.includes(status)) throw new Error("Invalid review status.");
  await updateDoc(doc(db, COLLECTIONS.REVIEWS, reviewId), {
    status,
    resolvedAt: status === "pending_review" ? null : serverTimestamp(),
    resolvedBy: status === "pending_review" ? null : user.uid,
    ...updateMeta(user),
  });
}

export async function resolveReview(review, status) {
  requireFirestore();
  const user = requireAuthUser();
  if (!REVIEW_STATUSES.includes(status)) throw new Error("Invalid review status.");
  await updateReviewStatus(review.id, status);
  await updateDocumentsForReview(review, status, user);
  await updateOnboardingForReview(review, status, user);
  if (review.type === "bank_details" && review.owner_uid) {
    await setDoc(
      doc(db, COLLECTIONS.CONSULTANTS, review.owner_uid),
      {
        bankStatus: status === "approved" ? "approved" : reviewDocumentStatus(status),
        bankDetails: {
          status: status === "approved" ? "approved" : reviewDocumentStatus(status),
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
        },
        ...updateMeta(user),
      },
      { merge: true }
    );
  }
  await updateApplicationForReview(review, status);
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
  const uid = application.candidate_uid;
  if (!uid) throw new Error("Application is missing candidate UID.");
  assertApplicationTransition(application.status || application.lifecycle_stage, "consultant_active", {
    ...context,
    application,
  });
  const consultantRef = doc(db, COLLECTIONS.CONSULTANTS, uid);
  const consultantSnap = await getDoc(consultantRef);
  const consultant = {
    uid,
    email: application.email,
    name: application.full_name || application.candidate_name,
    consultantId: profile.consultantId || `SMC-${uid.slice(0, 6).toUpperCase()}`,
    role: profile.role || application.position_title || "Consultant",
    client: profile.client || "",
    project: profile.project || "",
    monthlyPay: profile.monthlyPay || "",
    status: "Active consultant",
    bankStatus: "pending_review",
    panStatus: "pending_review",
    uanStatus: "pending_review",
    gstStatus: "not_required",
    startDate: profile.startDate || "",
    ...(consultantSnap.exists() ? {} : createMeta(user)),
    ...updateMeta(user),
  };
  await setDoc(consultantRef, consultant, { merge: true });
  await setDoc(
    doc(db, COLLECTIONS.USERS, uid),
    {
      role: "consultant",
      email: application.email,
      name: consultant.name,
      status: "active",
      ...updateMeta(user),
    },
    { merge: true }
  );
  await updateApplicationStatus(application, "consultant_active", context);
  return consultant;
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
      "SaturnMax Technologies Pvt Ltd hiring team",
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
