import React, { useMemo } from "react";
import { Bell, MailWarning } from "lucide-react";
import { EmptyState, SectionHeader, StatusBadge } from "../../components/ui";
import { useOperations } from "./OperationsContext";
import { humanDate, sortRecent } from "./operationsUtils";

export default function OperationsNotifications() {
  const { data } = useOperations();
  const items = useMemo(() => {
    const failedEmails = (data.emailEvents || [])
      .filter((event) => ["error", "failed", "skipped_no_recipient"].includes(event.status))
      .map((event) => ({
        id: `email-${event.id}`,
        title: `Email ${String(event.status || "event").replace(/_/g, " ")}`,
        body: `${event.templateId || event.type || "email"} / ${(event.to || []).join(", ") || "recipient missing"}`,
        status: event.status,
        createdAt: event.createdAt || event.created_at,
      }));
    const pendingReviews = (data.reviews || [])
      .filter((review) => review.status === "pending_review")
      .map((review) => ({
        id: `review-${review.id}`,
        title: `Pending review: ${review.title || review.type}`,
        body: review.owner_uid || review.candidate_uid || "owner missing",
        status: "pending_review",
        createdAt: review.createdAt || review.created_at,
      }));
    const newApplications = (data.applications || [])
      .filter((app) => app.status === "applied")
      .slice(0, 20)
      .map((app) => ({
        id: `app-${app.id}`,
        title: `New application: ${app.position_title}`,
        body: app.full_name || app.candidate_name || app.email || "Candidate",
        status: "applied",
        createdAt: app.createdAt || app.created_at,
      }));
    return sortRecent([...failedEmails, ...pendingReviews, ...newApplications], "createdAt").slice(0, 60);
  }, [data]);

  return (
    <div className="space-y-5" data-testid="operations-notifications-page">
      <SectionHeader
        eyebrow="Operations"
        title="Notification center"
        description="Email delivery issues, pending reviews, and fresh candidate activity that need team attention."
      />
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        {items.length === 0 && (
          <EmptyState title="No priority notifications" body="New applications, failed emails, and pending reviews will appear here." Icon={Bell} />
        )}
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#2563EB]">
                  <MailWarning className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{item.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{humanDate(item.createdAt)}</p>
                </div>
              </div>
              <StatusBadge value={item.status} withIcon={false} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
