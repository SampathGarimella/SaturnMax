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

const projectId = "company-rules-test";
const rulesPath = path.resolve(__dirname, "../../../../firestore.rules");

jest.setTimeout(30000);

function authedDb(uid, tokenOptions = {}) {
  return testEnv.authenticatedContext(uid, tokenOptions).firestore();
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
        email: "candidate@example.com",
        name: "Candidate",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "users", "candidate-2"), {
        role: "candidate",
        email: "other@example.com",
        name: "Other Candidate",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "users", "employee-1"), {
        role: "employee",
        email: "employee@example.com",
        name: "Employee",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "users", "admin-1"), {
        role: "admin",
        email: "admin@example.com",
        name: "Admin",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "users", "consultant-1"), {
        role: "consultant",
        email: "consultant@example.com",
        name: "Consultant",
        status: "active",
        createdAt: 1,
      }),
      setDoc(doc(db, "consultants", "consultant-1"), {
        uid: "consultant-1",
        email: "consultant@example.com",
        name: "Consultant",
        bankStatus: "pending_review",
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
      setDoc(doc(db, "mail", "mail-1"), {
        to: ["candidate@example.com"],
        template: { name: "application_received", data: { candidateName: "Candidate" } },
        createdAt: 1,
      }),
      setDoc(doc(db, "emailTemplates", "application_received"), {
        subject: "Application received",
        text: "Hi {{candidateName}}",
        active: true,
        createdAt: 1,
      }),
      setDoc(doc(db, "emailEvents", "email-event-1"), {
        templateId: "application_received",
        to: ["candidate@example.com"],
        status: "queued",
        createdAt: 1,
      }),
      setDoc(doc(db, "interviews", "interview-scheduled-1"), {
        candidate_uid: "candidate-1",
        application_id: "app-1",
        startsAt: "2026-06-01T15:00:00.000Z",
        status: "scheduled",
        createdAt: 1,
      }),
      setDoc(doc(db, "offerTemplates", "standard"), {
        name: "Standard offer",
        body: "Offer for {{candidateName}}",
        createdAt: 1,
      }),
      setDoc(doc(db, "offerLetters", "offer-1"), {
        candidate_uid: "candidate-1",
        application_id: "app-1",
        file_url: "https://example.com/offer.pdf",
        status: "sent",
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

  test("privileged workflow writes are blocked from direct client writes", async () => {
    const db = authedDb("employee-1");
    await assertFails(
      setDoc(doc(db, "jobs", "employee-job"), {
        title: "Cloud Engineer",
        description: "AWS delivery",
        status: "published",
      })
    );
    await assertFails(updateDoc(doc(db, "applications", "app-1"), { status: "screening" }));
    await assertFails(updateDoc(doc(db, "reviews", "review-1"), { status: "approved" }));
    await assertFails(updateDoc(doc(db, "jobs", "draft-job"), { status: "archived" }));
    await assertFails(deleteDoc(doc(db, "jobs", "draft-job")));
  });

  test("admin rules allow account setup while direct employee role changes are blocked", async () => {
    const employee = authedDb("employee-1");
    const admin = authedDb("admin-1");
    const candidate = authedDb("candidate-1", { email: "candidate@example.com" });
    const otherCandidate = authedDb("candidate-2");
    await assertFails(
      setDoc(doc(employee, "users", "new-consultant"), {
        role: "consultant",
        email: "new.consultant@example.com",
        name: "New Consultant",
        status: "active",
      })
    );
    await assertSucceeds(
      setDoc(doc(admin, "users", "new-consultant"), {
        role: "consultant",
        email: "new.consultant@example.com",
        name: "New Consultant",
        status: "active",
      })
    );
    await assertFails(
      setDoc(doc(employee, "candidates", "new-candidate"), {
        uid: "new-candidate",
        email: "new.candidate@example.com",
        name: "New Candidate",
      })
    );
    await assertSucceeds(
      setDoc(doc(candidate, "candidates", "candidate-1"), {
        uid: "candidate-1",
        email: "candidate@example.com",
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
    await assertFails(
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
        email: "fake@example.com",
      })
    );
  });

  test("admin can create consultant records and email index while employees and candidates cannot", async () => {
    const employee = authedDb("employee-1");
    const admin = authedDb("admin-1");
    const candidate = authedDb("candidate-1");
    await assertFails(
      setDoc(doc(employee, "consultants", "candidate-1"), {
        uid: "candidate-1",
        email: "candidate@example.com",
        name: "Candidate",
        sourceCandidateId: "candidate-1",
        consultantType: "Contract",
      })
    );
    await assertSucceeds(
      setDoc(doc(admin, "consultants", "candidate-1"), {
        uid: "candidate-1",
        email: "candidate@example.com",
        name: "Candidate",
        sourceCandidateId: "candidate-1",
        consultantType: "Contract",
      })
    );
    await assertFails(
      setDoc(doc(employee, "consultantEmailIndex", "candidate@example.com"), {
        email: "candidate@example.com",
        uid: "candidate-1",
      })
    );
    await assertSucceeds(
      setDoc(doc(admin, "consultantEmailIndex", "candidate@example.com"), {
        email: "candidate@example.com",
        uid: "candidate-1",
      })
    );
    await assertSucceeds(
      updateDoc(doc(employee, "consultants", "candidate-1"), {
        project: "Client onboarding",
        startDate: "2026-06-01",
        updatedAt: 2,
        updatedBy: "employee-1",
      })
    );
    await assertFails(
      updateDoc(doc(employee, "consultants", "candidate-1"), {
        monthlyPay: "180000",
        updatedAt: 2,
        updatedBy: "employee-1",
      })
    );
    await assertFails(
      setDoc(doc(candidate, "consultants", "candidate-2"), {
        uid: "candidate-2",
        email: "other@example.com",
      })
    );
    await assertFails(
      setDoc(doc(candidate, "consultantEmailIndex", "other@example.com"), {
        email: "other@example.com",
        uid: "candidate-2",
      })
    );
  });

  test("consultants can submit bank details but cannot approve their own compliance", async () => {
    const consultant = authedDb("consultant-1");
    await assertSucceeds(
      updateDoc(doc(consultant, "consultants", "consultant-1"), {
        bankDetails: {
          account_holder: "Consultant",
          bank_name: "HDFC",
          account_number: "1234567890",
          ifsc: "HDFC0001234",
        },
        bankStatus: "pending_review",
        updatedAt: 2,
        updatedBy: "consultant-1",
      })
    );
    await assertFails(
      updateDoc(doc(consultant, "consultants", "consultant-1"), {
        bankStatus: "approved",
        updatedAt: 3,
        updatedBy: "consultant-1",
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

  test("activity logs are writable only by employees for their own actor id", async () => {
    const candidate = authedDb("candidate-1");
    const employee = authedDb("employee-1");
    const anon = anonDb();
    await assertFails(
      setDoc(doc(candidate, "activityLogs", "activity-1"), {
        action: "application_status_transition",
        outcome: "blocked",
        actorUid: "candidate-1",
        createdAt: 2,
      })
    );
    await assertFails(
      setDoc(doc(employee, "activityLogs", "activity-2"), {
        action: "bad_actor",
        outcome: "blocked",
        actorUid: "candidate-1",
        createdAt: 2,
      })
    );
    await assertSucceeds(
      setDoc(doc(employee, "activityLogs", "activity-1"), {
        action: "job_archived",
        outcome: "success",
        actorUid: "employee-1",
        targetCollection: "jobs",
        targetId: "draft-job",
        createdAt: 2,
      })
    );
    await assertSucceeds(getDoc(doc(employee, "activityLogs", "activity-1")));
    await assertFails(getDoc(doc(anon, "activityLogs", "activity-1")));
  });

  test("candidate application create requires verified email", async () => {
    const unverified = authedDb("candidate-1", {
      email: "candidate@example.com",
      email_verified: false,
    });
    const verified = authedDb("candidate-1", {
      email: "candidate@example.com",
      email_verified: true,
    });
    const payload = {
      id: "candidate-app-create",
      candidate_uid: "candidate-1",
      candidate_name: "Candidate",
      email: "candidate@example.com",
      full_name: "Candidate",
      phone: "9876543210",
      position_title: "React Engineer",
      status: "applied",
      lifecycle_stage: "applied",
      createdAt: 2,
      createdBy: "candidate-1",
      updatedAt: 2,
      updatedBy: "candidate-1",
    };
    await assertFails(setDoc(doc(unverified, "applications", "candidate-app-create"), payload));
    await assertFails(
      setDoc(doc(verified, "applications", "candidate-app-wrong-email"), {
        ...payload,
        id: "candidate-app-wrong-email",
        email: "someone.else@example.com",
      })
    );
    await assertSucceeds(setDoc(doc(verified, "applications", "candidate-app-create"), payload));
  });

  test("public lead creation is constrained to safe website fields", async () => {
    const db = anonDb();
    await assertSucceeds(
      setDoc(doc(db, "leads", "lead-1"), {
        id: "lead-1",
        name: "Client",
        email: "client@example.com",
        company: "Client Co",
        subject: "I want to hire a dev team",
        budget_range: "10k-25k",
        timeline: "This month",
        message: "Please contact me.",
        status: "new",
        leadStatus: "new",
        source: "website",
        consent: true,
        createdAt: 2,
        updatedAt: 2,
      })
    );
    await assertFails(
      setDoc(doc(db, "leads", "lead-2"), {
        name: "Bad Lead",
        email: "bad@example.com",
        message: "x",
        role: "admin",
        status: "converted",
      })
    );
  });

  test("candidate document and review creates cannot self-approve", async () => {
    const candidate = authedDb("candidate-1");
    await assertSucceeds(
      setDoc(doc(candidate, "documents", "doc-1"), {
        owner_uid: "candidate-1",
        type: "signed_offer",
        status: "pending_review",
        createdAt: 2,
      })
    );
    await assertFails(
      setDoc(doc(candidate, "documents", "doc-2"), {
        owner_uid: "candidate-1",
        type: "signed_offer",
        status: "approved",
        createdAt: 2,
      })
    );
    await assertSucceeds(
      setDoc(doc(candidate, "reviews", "review-safe"), {
        owner_uid: "candidate-1",
        type: "signed_offer",
        status: "pending_review",
        createdAt: 2,
      })
    );
    await assertFails(
      setDoc(doc(candidate, "reviews", "review-approved"), {
        owner_uid: "candidate-1",
        type: "signed_offer",
        status: "approved",
        createdAt: 2,
      })
    );
  });

  test("mail queue and email audit collections are protected from client writes", async () => {
    const candidate = authedDb("candidate-1");
    const employee = authedDb("employee-1");
    const admin = authedDb("admin-1");

    await assertFails(
      setDoc(doc(candidate, "mail", "candidate-mail"), {
        to: ["hr@example.com"],
        message: { subject: "Bad", text: "Arbitrary email" },
      })
    );
    await assertFails(
      setDoc(doc(employee, "mail", "employee-mail"), {
        to: ["candidate@example.com"],
        message: { subject: "Bad", text: "Arbitrary email" },
      })
    );
    await assertSucceeds(getDoc(doc(employee, "mail", "mail-1")));
    await assertSucceeds(getDoc(doc(admin, "emailEvents", "email-event-1")));
    await assertFails(getDoc(doc(candidate, "emailEvents", "email-event-1")));
    await assertFails(
      setDoc(doc(employee, "emailEvents", "employee-event"), {
        status: "queued",
        templateId: "application_received",
      })
    );
  });

  test("template management is admin-only while employees can read configured templates", async () => {
    const candidate = authedDb("candidate-1");
    const employee = authedDb("employee-1");
    const admin = authedDb("admin-1");

    await assertSucceeds(getDoc(doc(employee, "emailTemplates", "application_received")));
    await assertFails(getDoc(doc(candidate, "emailTemplates", "application_received")));
    await assertFails(
      setDoc(doc(employee, "emailTemplates", "new_template"), {
        subject: "No",
        text: "No",
      })
    );
    await assertSucceeds(
      setDoc(doc(admin, "emailTemplates", "new_template"), {
        subject: "Yes",
        text: "Yes",
      })
    );
    await assertSucceeds(getDoc(doc(employee, "offerTemplates", "standard")));
    await assertFails(
      setDoc(doc(employee, "offerTemplates", "employee_offer"), {
        name: "Employee edit",
      })
    );
    await assertSucceeds(
      setDoc(doc(admin, "offerTemplates", "admin_offer"), {
        name: "Admin edit",
      })
    );
  });

  test("candidate can read only their own interviews and offer letters", async () => {
    const candidate = authedDb("candidate-1");
    const otherCandidate = authedDb("candidate-2");
    const employee = authedDb("employee-1");

    await assertSucceeds(getDoc(doc(candidate, "interviews", "interview-scheduled-1")));
    await assertSucceeds(getDoc(doc(candidate, "offerLetters", "offer-1")));
    await assertFails(getDoc(doc(otherCandidate, "interviews", "interview-scheduled-1")));
    await assertFails(getDoc(doc(otherCandidate, "offerLetters", "offer-1")));
    await assertSucceeds(getDoc(doc(employee, "interviews", "interview-scheduled-1")));
    await assertSucceeds(getDoc(doc(employee, "offerLetters", "offer-1")));
    await assertFails(
      setDoc(doc(candidate, "interviews", "bad-interview-write"), {
        candidate_uid: "candidate-1",
        status: "scheduled",
      })
    );
    await assertFails(
      setDoc(doc(employee, "offerLetters", "employee-offer-write"), {
        candidate_uid: "candidate-1",
        status: "sent",
      })
    );
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
