const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

const CONSULTANT_TYPES = new Set(["Contract", "Full-time", "Bench", "Client-assigned"]);
const ROLES = new Set(["candidate", "consultant", "employee", "admin"]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
      rate: data.rate || "",
      monthlyPay: data.rate || "",
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Enter a valid email.");
  }

  const { user, created } = await getOrCreateAuthUser({ email, name });
  const uid = data.uid || user.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();
  const userRef = db.collection("users").doc(uid);
  const activityRef = db.collection("activityLogs").doc();

  await db.runTransaction(async (transaction) => {
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
      createdAt: now,
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
  await db.collection("users").doc(uid).set({
    status: "inactive",
    disabled: true,
    updatedAt: now,
    updatedBy: request.auth.uid,
  }, { merge: true });
  await db.collection("consultants").doc(uid).set({
    status: "Inactive",
    loginEnabled: false,
    updatedAt: now,
    updatedBy: request.auth.uid,
  }, { merge: true });
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
