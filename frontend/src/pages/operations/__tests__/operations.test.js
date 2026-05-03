import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import OperationsApplications from "../OperationsApplications";
import OperationsHiringCandidates from "../OperationsHiringCandidates";
import OperationsManualConsultant from "../OperationsManualConsultant";
import OperationsReviews from "../OperationsReviews";
import { OperationsContext } from "../OperationsContext";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let mockRouteParams = {};

jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ to, children, ...props }) => {
      const ReactMock = require("react");
      return ReactMock.createElement("a", { href: to, ...props }, children);
    },
    useParams: () => mockRouteParams,
  }),
  { virtual: true }
);

const baseData = {
  jobs: [],
  applications: [
    {
      id: "app-1",
      full_name: "Candidate One",
      candidate_name: "Candidate One",
      candidate_uid: "candidate-1",
      email: "candidate@saturnmax.com",
      position_title: "React Engineer",
      status: "onboarding",
      workflowStage: "approved",
      candidateApprovalStatus: "approved",
      status_next_action: "Complete onboarding and compliance review.",
      updatedAt: 3,
    },
  ],
  reviews: [
    {
      id: "review-1",
      owner_uid: "candidate-1",
      application_id: "app-1",
      type: "signed_offer",
      title: "Signed offer",
      status: "pending_review",
      updatedAt: 4,
    },
  ],
  documents: [
    { id: "doc-1", owner_uid: "candidate-1", application_id: "app-1", type: "signed_offer", status: "approved" },
    { id: "resume-1", owner_uid: "candidate-1", type: "resume", status: "uploaded", file_url: "https://example.com/resume.pdf" },
  ],
  consultants: [],
  leads: [],
  users: [],
  candidates: [],
  activityLogs: [
    {
      id: "log-1",
      action: "application_status_transition",
      outcome: "blocked",
      targetCollection: "applications",
      targetId: "app-1",
    },
  ],
  messageThreads: [],
};

function renderWithOperations(ui) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <OperationsContext.Provider
        value={{
          data: baseData,
          loading: false,
          error: "",
          busy: "",
          setBusy: jest.fn(),
          load: jest.fn(),
          workflowContextFor: (application) => ({ application, documents: baseData.documents, reviews: baseData.reviews }),
          showMutationError: jest.fn((err) => ({ title: err?.message || "Error", body: "" })),
        }}
        >
        {ui}
      </OperationsContext.Provider>
    );
  });
  return { container, root };
}

test("applications module exposes saved views and contextual status guidance", () => {
  const { container, root } = renderWithOperations(<OperationsApplications />);
  expect(container.querySelector("[role='tablist']")).not.toBeNull();
  expect(container.textContent).toContain("Blocked activation");
  expect(container.textContent).toContain("Complete onboarding and compliance review.");
  act(() => root.unmount());
  container.remove();
});

test("reviews module renders queue filters and activity feed", () => {
  const { container, root } = renderWithOperations(<OperationsReviews />);
  expect(container.textContent).toContain("Pending review");
  expect(container.textContent).toContain("Activity feed");
  expect(container.textContent).toContain("application status transition");
  act(() => root.unmount());
  container.remove();
});

test("hiring candidates module renders workflow actions", () => {
  mockRouteParams = {};
  const { container, root } = renderWithOperations(<OperationsHiringCandidates />);
  expect(container.textContent).toContain("Candidate -> Consultant Workflow");
  expect(container.textContent).toContain("View Profile");
  expect(container.textContent).toContain("Add Review");
  expect(container.textContent).toContain("Convert");
  act(() => root.unmount());
  container.remove();
});

test("candidate detail renders stepper, reviews, and conversion panel", () => {
  mockRouteParams = { applicationId: "app-1" };
  const { container, root } = renderWithOperations(<OperationsHiringCandidates />);
  expect(container.textContent).toContain("Workflow stage");
  expect(container.textContent).toContain("Interview reviews");
  expect(container.textContent).toContain("Conversion panel");
  act(() => root.unmount());
  container.remove();
  mockRouteParams = {};
});

test("manual consultant form explains Firebase Auth setup", () => {
  const { container, root } = renderWithOperations(<OperationsManualConsultant />);
  expect(container.textContent).toContain("Manual Add Consultant");
  expect(container.textContent).toContain("Login setup behavior");
  expect(container.textContent).toContain("Create consultant");
  act(() => root.unmount());
  container.remove();
});
