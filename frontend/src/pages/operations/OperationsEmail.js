import React, { useMemo } from "react";
import { MailCheck } from "lucide-react";
import { EmptyState, SectionHeader, StatusBadge } from "../../components/ui";
import { useOperations } from "./OperationsContext";
import { humanDate, sortRecent } from "./operationsUtils";

export default function OperationsEmail() {
  const { data } = useOperations();
  const templates = useMemo(
    () => [...(data.emailTemplates || [])].sort((a, b) => String(a.id || "").localeCompare(String(b.id || ""))),
    [data.emailTemplates]
  );
  const events = useMemo(
    () => sortRecent(data.emailEvents || [], "createdAt").slice(0, 80),
    [data.emailEvents]
  );
  const failedEvents = events.filter((event) => {
    const status = String(event.status || "").toLowerCase();
    return status.includes("failed") || status.includes("blocked") || status.includes("skipped");
  });

  return (
    <div className="space-y-5" data-testid="operations-email-page">
      <SectionHeader
        eyebrow="Email"
        title="Email workflow"
        description="Monitor lifecycle email templates and delivery events used for applications, interviews, offers, onboarding, and consultant access."
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Metric label="Lifecycle templates" value={templates.length} />
        <Metric label="Recent email events" value={events.length} />
        <Metric label="Needs attention" value={failedEvents.length} tone={failedEvents.length ? "rose" : "emerald"} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Templates</h2>
          <p className="mt-1 text-sm text-slate-500">
            Employees can view templates. Admins can edit and seed defaults from the Admin Portal.
          </p>
          <div className="mt-4 space-y-2">
            {templates.length === 0 && (
              <EmptyState title="No email templates yet" body="Ask an admin to seed the default lifecycle templates." Icon={MailCheck} />
            )}
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{template.id}</div>
                    <div className="mt-1 text-xs text-slate-500">{template.subject || "Subject not set"}</div>
                  </div>
                  <StatusBadge value={template.active === false ? "inactive" : "active"} withIcon={false} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Recent delivery events</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use this list to confirm whether application, interview, offer, onboarding, and invite emails were queued or failed.
          </p>
          <div className="mt-4 space-y-2">
            {events.length === 0 && (
              <EmptyState title="No email events yet" body="Events appear after workflow actions queue emails." Icon={MailCheck} />
            )}
            {events.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{event.templateId || event.type || "email_event"}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {(Array.isArray(event.to) ? event.to.join(", ") : event.to) || "recipient not set"}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {event.entityType || "record"} / {event.entityId || "unknown"} / {humanDate(event.createdAt || event.created_at)}
                    </div>
                  </div>
                  <StatusBadge value={event.status || "queued"} withIcon={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone = "blue" }) {
  const toneClass = tone === "rose"
    ? "border-rose-200 bg-rose-50 text-rose-800"
    : tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
