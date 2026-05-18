import {
  APPLICATION_LABELS,
  buildConsultantInviteMessage,
  getActivationChecklist,
  getApplicationStatusMeta,
  getHiringApplicationStatus,
  getHiringStageMeta,
  getMessageReadPatch,
  normalizeHiringStage,
  normalizeApplicationStatus,
  normalizeMessageData,
  validateHiringStageTransition,
  validateApplicationTransition,
} from "../workflow";

describe("application status source", () => {
  test("normalizes legacy statuses to canonical lifecycle labels", () => {
    expect(normalizeApplicationStatus("pending")).toBe("applied");
    expect(normalizeApplicationStatus("under_review")).toBe("screening");
    expect(getApplicationStatusMeta("offer").label).toBe(APPLICATION_LABELS.offer_sent);
  });
});

describe("application transition guards", () => {
  test("allows only configured next moves", () => {
    expect(validateApplicationTransition("applied", "screening")).toMatchObject({ ok: true });
    expect(validateApplicationTransition("applied", "selected")).toMatchObject({
      ok: false,
      reason: "Cannot move Applied to Selected.",
      nextAction: "Move to Screening, Not shortlisted first.",
    });
  });

  test("blocks consultant activation until required checklist is approved", () => {
    const blocked = validateApplicationTransition("onboarding", "consultant_active", {
      application: { id: "app-1", candidate_uid: "candidate-1" },
      documents: [{ application_id: "app-1", owner_uid: "candidate-1", type: "signed_offer", status: "approved" }],
      reviews: [],
    });
    expect(blocked).toMatchObject({ ok: false });
    expect(blocked.missing.map((item) => item.type)).toContain("signed_onboarding");

    const allowed = validateApplicationTransition("onboarding", "consultant_active", {
      application: { id: "app-1", candidate_uid: "candidate-1" },
      documents: [
        { application_id: "app-1", owner_uid: "candidate-1", type: "signed_offer", status: "approved" },
        { application_id: "app-1", owner_uid: "candidate-1", type: "signed_onboarding", status: "approved" },
      ],
      reviews: [],
    });
    expect(allowed).toMatchObject({ ok: true });
  });

  test("includes configured compliance docs in activation checklist", () => {
    const checklist = getActivationChecklist({
      application: { id: "app-1", candidate_uid: "candidate-1" },
      documents: [
        { application_id: "app-1", owner_uid: "candidate-1", type: "signed_offer", status: "approved" },
        { application_id: "app-1", owner_uid: "candidate-1", type: "signed_onboarding", status: "approved" },
        { application_id: "app-1", owner_uid: "candidate-1", type: "form12bb", status: "pending_review" },
      ],
      reviews: [],
    });
    expect(checklist.find((item) => item.type === "form12bb")).toMatchObject({
      complete: false,
    });
  });
});

describe("hiring workflow source", () => {
  test("normalizes application statuses to hiring stages", () => {
    expect(normalizeHiringStage("", "selected")).toBe("approved");
    expect(getHiringStageMeta("technical_interview").label).toBe("Technical Interview");
    expect(getHiringApplicationStatus("client_interview")).toBe("interview");
  });

  test("allows sequential hiring moves and blocks skipped stages", () => {
    expect(validateHiringStageTransition("applied", "resume_review")).toMatchObject({ ok: true });
    expect(validateHiringStageTransition("applied", "technical_interview")).toMatchObject({
      ok: false,
      nextAction: "Move to Resume Review first.",
    });
  });

  test("builds consultant invite text without sending email", () => {
    const invite = buildConsultantInviteMessage({
      name: "Priya",
      email: "priya@example.com",
      consultantLoginUrl: "https://example.com/consultant-login",
    });
    expect(invite.subject).toBe("Welcome to Company Consultant Portal");
    expect(invite.body).toContain("Priya");
    expect(invite.body).toContain("priya@example.com");
  });
});

describe("message unread mapping", () => {
  test("maps legacy unread flag to canonical fields", () => {
    expect(normalizeMessageData("m1", { author: "candidate", unread: true })).toMatchObject({
      unreadForEmployee: true,
      unreadForCandidate: false,
    });
    expect(normalizeMessageData("m2", { author: "employee", unread: true })).toMatchObject({
      unreadForEmployee: false,
      unreadForCandidate: true,
    });
  });

  test("builds viewer-specific read patches", () => {
    expect(getMessageReadPatch("candidate", "candidate-1", 123)).toMatchObject({
      unreadForCandidate: false,
      candidateReadAt: 123,
      updatedBy: "candidate-1",
    });
    expect(getMessageReadPatch("employee", "employee-1", 456)).toMatchObject({
      unreadForEmployee: false,
      employeeReadAt: 456,
      updatedBy: "employee-1",
    });
  });
});
