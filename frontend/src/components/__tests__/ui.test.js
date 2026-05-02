import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ConfirmModal, EmptyState, StatusBadge } from "../ui";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock(
  "react-router-dom",
  () => ({
    Link: ({ to, children, ...props }) => {
      const ReactMock = require("react");
      return ReactMock.createElement("a", { href: to, ...props }, children);
    },
  }),
  { virtual: true }
);

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("StatusBadge exposes non-color status text and aria label", () => {
  act(() => {
    root.render(<StatusBadge value="offer_sent" />);
  });
  expect(container.textContent).toContain("Offer sent");
  expect(container.querySelector("[aria-label='Status: Offer sent']")).not.toBeNull();
});

test("EmptyState can render a route CTA", () => {
  act(() => {
    root.render(
      <EmptyState title="No jobs" body="Post one" action="Go" to="/employee-dashboard/jobs" />
    );
  });
  const link = container.querySelector("a[href='/employee-dashboard/jobs']");
  expect(link).not.toBeNull();
  expect(link.textContent).toBe("Go");
});

test("ConfirmModal uses dialog semantics and closes on Escape", () => {
  const onCancel = jest.fn();
  act(() => {
    root.render(
      <ConfirmModal
        open
        title="Delete job?"
        body="This cannot be undone."
        onCancel={onCancel}
        onConfirm={() => {}}
      />
    );
  });
  expect(container.querySelector("[role='dialog'][aria-modal='true']")).not.toBeNull();
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
  expect(onCancel).toHaveBeenCalledTimes(1);
});
