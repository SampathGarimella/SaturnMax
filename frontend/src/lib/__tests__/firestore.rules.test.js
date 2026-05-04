/** @jest-environment node */

import "cross-fetch/polyfill";
import fs from "fs";
import path from "path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setLogLevel,
  setDoc,
  updateDoc,
} from "firebase/firestore";

let testEnv;

const projectId = "saturnmax-rules-test";
const rulesPath = path.resolve(__dirname, "../../../../firestore.rules");

jest.setTimeout(30000);

function authedDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function anonDb() {
  return testEnv.unauthenticatedContext().firestore();
}

beforeAll(async () => {
  setLogLevel("error");
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync(rulesPath, "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users", "candidate-1"), {
        role: "candidate",
        email: "candidate@saturnmax.com",
        name: "Candidate",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "users", "candidate-2"), {
        role: "candidate",
        email: "other@saturnmax.com",
        name: "Other Candidate",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "users", "employee-1"), {
        role: "employee",
        email: "employee@saturnmax.com",
        name: "Employee",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "users", "admin-1"), {
        role: "admin",
        email: "admin@saturnmax.com",
        name: "Admin",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "users", "consultant-1"), {
        role: "consultant",
        email: "consultant@saturnmax.com",
        name: "Consultant",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "jobs", "published-job"), {
        title: "React Engineer",
        description: "Build production apps",
        status: "published",
        createdAt: 1,
      }),
      setDoc(doc(db, "jobs", "draft-job"), {
        title: "Internal Role",
        description: "Draft",
        status: "draft",
        createdAt: 1,
      }),
      setDoc(doc(db, "applications", "app-1"), {
        candidate_uid: "candidate-1",
        position_title: "React Engineer",
        status: "offer_sent",
        createdAt: 1,
      }),
      setDoc(doc(db, "applications", "app-2"), {
        candidate_uid: "candidate-2",
        position_title: "Python Engineer",
        status: "applied",
        createdAt: 1,
      }),
      setDoc(doc(db, "reviews", "review-1"), {
        owner_uid: "candidate-1",
        type: "signed_offer",
        status: "pending_review",
        createdAt: 1,
      }),
      setDoc(doc(db, "reviews", "interview-1"), {
        candidate_uid: "candidate-1",
        application_id: "app-1",
        type: "interview_review",
        status: "completed",
        notes: "Strong technical interview",
        createdAt: 1,
      }),
    ]);
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe("Firestore security rules", () => {
  test("public can read published jobs only", async () => {
    const db = anonDb();
    await assertSucceeds(getDoc(doc(db, "jobs", "published-job")));
    await assertFails(getDoc(doc(db, "jobs", "draft-job")));
    await assertFails(getDoc(doc(db, "applications", "app-1")));
  });

  test("candidate cannot overwrite role or mutate another candidate application", async () => {
    const db = authedDb("candidate-1");
    await assertFails(updateDoc(doc(db, "users", "candidate-1"), { role: "admin" }));
    await assertSucceeds(
      updateDoc(doc(db, "users", "candidate-1"), {
        notificationPreferences: { applicationUpdates: true, recruiterMessages: false },
        uiPreferences: { theme: "system" },
        updatedAt: 2,
        updatedBy: "candidate-1",
      })
    );
    await assertSucceeds(updateDoc(doc(db, "applications", "app-1"), { status: "offer_signed" }));
    await assertFails(updateDoc(doc(db, "applications", "app-2"), { status: "offer_signed" }));
  });

  test("employee can manage jobs, applications, and reviews", async () => {
    const db = authedDb("employee-1");
    await assertSucceeds(
      setDoc(doc(db, "jobs", "employee-job"), {
        title: "Cloud Engineer",
        description: "AWS delivery",
        status: "published",
      })
    );
    await assertSucceeds(updateDoc(doc(db, "applications", "app-1"), { status: "screening" }));
    await assertSucceeds(updateDoc(doc(db, "reviews", "review-1"), { status: "approved" }));
    await assertSucceeds(deleteDoc(doc(db, "jobs", "draft-job")));
  });

  test("admin rules allow account setup while employees can convert candidates", async () => {
    const employee = authedDb("employee-1");
    const admin = authedDb("admin-1");
    const candidate = authedDb("candidate-1");
    const otherCandidate = authedDb("candidate-2");
    await assertFails(
      setDoc(doc(employee, "users", "new-consultant"), {
        role: "consultant",
        email: "new.consultant@saturnmax.com",
        name: "New Consultant",
        status: "active",
      })
    );
    await assertSucceeds(
      setDoc(doc(admin, "users", "new-consultant"), {
        role: "consultant",
        email: "new.consultant@saturnmax.com",
        name: "New Consultant",
        status: "active",
      })
    );
    await assertSucceeds(
      setDoc(doc(employee, "candidates", "new-candidate"), {
        uid: "new-candidate",
        email: "new.candidate@saturnmax.com",
        name: "New Candidate",
      })
    );
    await assertSucceeds(
      setDoc(doc(candidate, "candidates", "candidate-1"), {
        uid: "candidate-1",
        email: "candidate@saturnmax.com",
        name: "Candidate",
      })
    );
    await assertSucceeds(
      updateDoc(doc(candidate, "candidates", "candidate-1"), {
        phone: "9876543210",
        primary_skills: "React, Firebase",
        years_experience: "3-5",
        current_ctc_lpa: "12",
        expected_ctc_lpa: "18",
        updatedAt: 2,
        updatedBy: "candidate-1",
      })
    );
    await assertSucceeds(
      updateDoc(doc(employee, "users", "candidate-1"), {
        role: "consultant",
        status: "active",
        updatedAt: 3,
        updatedBy: "employee-1",
      })
    );
    await assertFails(
      setDoc(doc(otherCandidate, "users", "fake-admin"), {
        role: "admin",
        email: "fake@saturnmax.com",
      })
    );
  });

  test("employee can create consultant records and email index, candidates cannot", async () => {
    const employee = authedDb("employee-1");
    const candidate = authedDb("candidate-1");
    await assertSucceeds(
      setDoc(doc(employee, "consultants", "candidate-1"), {
        uid: "candidate-1",
        email: "candidate@saturnmax.com",
        name: "Candidate",
        sourceCandidateId: "candidate-1",
        consultantType: "Contract",
      })
    );
    await assertSucceeds(
      setDoc(doc(employee, "consultantEmailIndex", "candidate@saturnmax.com"), {
        email: "candidate@saturnmax.com",
        uid: "candidate-1",
      })
    );
    await assertFails(
      setDoc(doc(candidate, "consultants", "candidate-2"), {
        uid: "candidate-2",
        email: "other@saturnmax.com",
      })
    );
    await assertFails(
      setDoc(doc(candidate, "consultantEmailIndex", "other@saturnmax.com"), {
        email: "other@saturnmax.com",
        uid: "candidate-2",
      })
    );
  });

  test("employee-only interview reviews are hidden from candidate and consultant", async () => {
    const employee = authedDb("employee-1");
    const candidate = authedDb("candidate-1");
    const consultant = authedDb("consultant-1");
    await assertSucceeds(getDoc(doc(employee, "reviews", "interview-1")));
    await assertFails(getDoc(doc(candidate, "reviews", "interview-1")));
    await assertFails(getDoc(doc(consultant, "reviews", "interview-1")));
    await assertFails(
      setDoc(doc(candidate, "reviews", "candidate-interview"), {
        owner_uid: "candidate-1",
        type: "interview_review",
        status: "completed",
      })
    );
  });

  test("activity logs are writable by signed-in users and readable by employees", async () => {
    const candidate = authedDb("candidate-1");
    const employee = authedDb("employee-1");
    const anon = anonDb();
    await assertSucceeds(
      setDoc(doc(candidate, "activityLogs", "activity-1"), {
        action: "application_status_transition",
        outcome: "blocked",
        actorUid: "candidate-1",
        createdAt: 2,
      })
    );
    await assertSucceeds(getDoc(doc(employee, "activityLogs", "activity-1")));
    await assertFails(getDoc(doc(anon, "activityLogs", "activity-1")));
  });

  test("messages are restricted to candidate owner or employee", async () => {
    const candidate = authedDb("candidate-1");
    const otherCandidate = authedDb("candidate-2");
    const employee = authedDb("employee-1");
    const thread = collection(candidate, "messages", "candidate-1", "thread");

    const candidateMessage = await assertSucceeds(
      addDoc(thread, {
        author: "candidate",
        candidate_uid: "candidate-1",
        text: "Hello hiring team",
        unreadForEmployee: true,
        unreadForCandidate: false,
      })
    );
    await assertFails(getDoc(doc(otherCandidate, "messages", "candidate-1")));
    await assertFails(
      addDoc(collection(otherCandidate, "messages", "candidate-1", "thread"), {
        author: "candidate",
        candidate_uid: "candidate-2",
        text: "Wrong thread",
      })
    );
    const employeeMessage = await assertSucceeds(
      addDoc(collection(employee, "messages", "candidate-1", "thread"), {
        author: "employee",
        candidate_uid: "candidate-1",
        text: "Thanks for the update",
        unreadForEmployee: false,
        unreadForCandidate: true,
      })
    );
    await assertSucceeds(
      updateDoc(doc(employee, "messages", "candidate-1", "thread", candidateMessage.id), {
        unreadForEmployee: false,
        employeeReadAt: 2,
        updatedAt: 2,
        updatedBy: "employee-1",
      })
    );
    await assertSucceeds(
      updateDoc(doc(candidate, "messages", "candidate-1", "thread", employeeMessage.id), {
        unreadForCandidate: false,
        candidateReadAt: 3,
        updatedAt: 3,
        updatedBy: "candidate-1",
      })
    );
    await assertFails(
      updateDoc(doc(otherCandidate, "messages", "candidate-1", "thread", employeeMessage.id), {
        unreadForCandidate: false,
      })
    );
  });
});
