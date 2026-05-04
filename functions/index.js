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
