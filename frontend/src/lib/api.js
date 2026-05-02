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
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, isFirebaseConfigured, storage } from "./firebase";

export const BACKEND_CONFIGURED = false;

export const APPLICATION_STAGES = [
  "applied",
  "screening",
  "interview",
  "selected",
  "offer_sent",
  "offer_signed",
  "onboarding",
  "consultant_active",
];

export const JOB_STATUSES = ["draft", "published", "paused", "closed"];

const APPLICATION_LABELS = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  selected: "Selected",
  offer_sent: "Offer sent",
  offer_signed: "Offer signed",
  onboarding: "Onboarding",
  consultant_active: "Consultant active",
  not_shortlisted: "Not shortlisted",
};

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
  const status = app.status || "applied";
  return {
    ...app,
    id: app.id,
    status,
    status_label: APPLICATION_LABELS[status] || status,
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
    const data = snap.data() || {};
    const candidateUid = data.candidate_uid || snap.ref.parent.parent?.id;
    if (!candidateUid) return;

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
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const existingRole = userSnap.exists() ? userSnap.data()?.role : null;
  const name = user.displayName || user.name || user.email?.split("@")[0] || "Candidate";

  await setDoc(
    userRef,
    {
      role: existingRole || "candidate",
      email: user.email || "",
      name,
      status: userSnap.exists() ? userSnap.data()?.status || "active" : "active",
      ...(userSnap.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (existingRole && existingRole !== "candidate") return;

  await setDoc(
    doc(db, "candidates", user.uid),
    {
      uid: user.uid,
      email: user.email || "",
      name,
      role_label: "Job Candidate",
      ...(userSnap.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function fetchJobs({ includeAll = false } = {}) {
  if (!isFirebaseConfigured || !db) return [];
  const base = collection(db, "jobs");
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
    updatedAt: serverTimestamp(),
  };
  if (!body.title || !body.description) {
    throw new Error("Add a job title and description.");
  }
  if (payload.id) {
    await updateDoc(doc(db, "jobs", payload.id), body);
    return { id: payload.id, ...body };
  }
  const refDoc = await addDoc(collection(db, "jobs"), {
    ...body,
    createdAt: serverTimestamp(),
  });
  await setDoc(refDoc, { id: refDoc.id }, { merge: true });
  return { id: refDoc.id, ...body };
}

export async function updateJobStatus(jobId, status) {
  requireFirestore();
  if (!JOB_STATUSES.includes(status)) throw new Error("Invalid job status.");
  await updateDoc(doc(db, "jobs", jobId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJob(jobId) {
  requireFirestore();
  await deleteDoc(doc(db, "jobs", jobId));
}

export async function submitApplication(payload) {
  requireFirestore();
  const user = requireAuthUser();
  if (!payload.full_name || !payload.email || !payload.phone || !payload.position_title) {
    throw new Error("Please complete name, email, phone, and position.");
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
    updatedAt: serverTimestamp(),
  };

  await setDoc(
    doc(db, "candidates", user.uid),
    { ...candidateProfile, createdAt: serverTimestamp() },
    { merge: true }
  );
  await setDoc(
    doc(db, "users", user.uid),
    {
      role: "candidate",
      email: payload.email,
      name: payload.full_name,
      status: "active",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  const appRef = await addDoc(collection(db, "applications"), {
    ...payload,
    candidate_uid: user.uid,
    candidate_name: payload.full_name,
    status: "applied",
    lifecycle_stage: "applied",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(appRef, { id: appRef.id }, { merge: true });
  return { id: appRef.id, ...payload, status: "applied" };
}

export async function submitContact(payload) {
  requireFirestore();
  if (!payload.name || !payload.email || !payload.message) {
    throw new Error("Please complete name, email, and message.");
  }
  const refDoc = await addDoc(collection(db, "leads"), {
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
  const snap = await getDocs(query(collection(db, "applications"), where("candidate_uid", "==", uid)));
  return snap.docs
    .map(mapDoc)
    .map(normalizeApplication)
    .sort((a, b) => tsValue(b.createdAt || b.created_at) - tsValue(a.createdAt || a.created_at));
}

export async function fetchDocumentsForOwner(uid) {
  if (!isFirebaseConfigured || !db || !uid) return [];
  const snap = await getDocs(query(collection(db, "documents"), where("owner_uid", "==", uid)));
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
    getDoc(doc(db, "candidates", user.uid)),
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
    title: `${APPLICATION_LABELS[app.status] || app.status}: ${app.position_title}`,
    timestamp_label: app.applied_ago || "recently",
    color:
      app.status === "not_shortlisted"
        ? "red"
        : app.status.includes("offer") || app.status === "consultant_active"
        ? "green"
        : app.status === "interview"
        ? "blue"
        : "amber",
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
  if (!storage) throw new Error("Storage is not configured.");
  if (!file) throw new Error("Choose a file first.");
  const fileRef = ref(storage, path);
  const task = uploadBytesResumable(fileRef, file, { contentType: file.type });
  await new Promise((resolve, reject) => {
    task.on("state_changed", undefined, reject, resolve);
  });
  const url = await getDownloadURL(task.snapshot.ref);
  const refDoc = await addDoc(collection(db, "documents"), {
    owner_uid: ownerUid,
    application_id: applicationId || null,
    type,
    title: title || file.name,
    file_name: file.name,
    file_url: url,
    storage_path: path,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
    doc(db, "candidates", candidateUid),
    {
      resume_uploaded: true,
      resume_url: uploaded.file_url,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return uploaded;
}

export async function fetchOperationsData() {
  requireFirestore();
  const [jobs, apps, usersSnap, candidatesSnap, consultantsSnap, reviewsSnap, docsSnap, leadsSnap] = await Promise.all([
    fetchJobs({ includeAll: true }),
    getDocs(collection(db, "applications")),
    getDocs(collection(db, "users")),
    getDocs(collection(db, "candidates")),
    getDocs(collection(db, "consultants")),
    getDocs(collection(db, "reviews")),
    getDocs(collection(db, "documents")),
    getDocs(collection(db, "leads")),
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
          collection(db, "messages", uid, "thread"),
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

export async function updateApplicationStatus(application, status) {
  requireFirestore();
  if (![...APPLICATION_STAGES, "not_shortlisted"].includes(status)) {
    throw new Error("Invalid application status.");
  }
  await updateDoc(doc(db, "applications", application.id), {
    status,
    lifecycle_stage: status,
    updatedAt: serverTimestamp(),
  });
  if (status === "onboarding") {
    await setDoc(
      doc(db, "onboarding", application.id),
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
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
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
  const uploaded = await uploadTrackedFile({
    file,
    path: `${folder}/${user.uid}/${application.id}/${type}.${ext}`,
    ownerUid: user.uid,
    applicationId: application.id,
    type,
    title: type === "signed_offer" ? "Signed offer letter" : "Signed onboarding document",
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

export async function createReview(payload) {
  requireFirestore();
  const refDoc = await addDoc(collection(db, "reviews"), {
    ...payload,
    status: payload.status || "pending_review",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(refDoc, { id: refDoc.id }, { merge: true });
  return { id: refDoc.id };
}

export async function updateReviewStatus(reviewId, status) {
  requireFirestore();
  await updateDoc(doc(db, "reviews", reviewId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function resolveReview(review, status) {
  requireFirestore();
  await updateReviewStatus(review.id, status);
  if (review.type === "bank_details" && review.owner_uid) {
    await setDoc(
      doc(db, "consultants", review.owner_uid),
      {
        bankStatus: status === "approved" ? "approved" : "rejected",
        bankDetails: {
          status: status === "approved" ? "approved" : "rejected",
          reviewedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function updateConsultantProfile(uid, profile) {
  requireFirestore();
  await setDoc(
    doc(db, "consultants", uid),
    {
      ...profile,
      uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function convertToConsultant(application, profile = {}) {
  requireFirestore();
  const uid = application.candidate_uid;
  if (!uid) throw new Error("Application is missing candidate UID.");
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
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "consultants", uid), consultant, { merge: true });
  await setDoc(
    doc(db, "users", uid),
    {
      role: "consultant",
      email: application.email,
      name: consultant.name,
      status: "active",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await updateApplicationStatus(application, "consultant_active");
  return consultant;
}

export async function fetchConsultantDashboard(uid) {
  requireFirestore();
  const [consultantSnap, documents, reviewsSnap] = await Promise.all([
    getDoc(doc(db, "consultants", uid)),
    fetchDocumentsForOwner(uid),
    getDocs(query(collection(db, "reviews"), where("owner_uid", "==", uid))),
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
    doc(db, "consultants", user.uid),
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
      updatedAt: serverTimestamp(),
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
    query(collection(db, "messages", candidateUid, "thread"), orderBy("createdAt", "asc"), limit(200))
  );
  return snap.docs.map((item) => {
    const data = mapDoc(item);
    return {
      ...data,
      candidate_uid: data.candidate_uid || candidateUid,
      time: formatMessageTime(data.createdAt || data.created_at),
    };
  });
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
  await addDoc(collection(db, "messages", current.uid, "thread"), {
    author: "candidate",
    authorRole: "candidate",
    authorName: user?.name || current.displayName || current.email?.split("@")[0] || "Candidate",
    candidate_uid: current.uid,
    candidate_email: current.email || user?.email || "",
    text: body,
    unreadForEmployee: true,
    unreadForCandidate: false,
    createdAt: serverTimestamp(),
  });
}

export async function sendHiringMessage({ candidateUid, text, employee }) {
  requireFirestore();
  const current = requireAuthUser();
  const body = text?.trim();
  if (!candidateUid) throw new Error("Choose a candidate thread.");
  if (!body) throw new Error("Enter a reply.");
  await addDoc(collection(db, "messages", candidateUid, "thread"), {
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
    createdAt: serverTimestamp(),
  });
}

export async function recordLoginEvent(session) {
  if (!isFirebaseConfigured || !db) return;
  await addDoc(collection(db, "loginEvents"), {
    ...session,
    createdAt: serverTimestamp(),
  });
}
