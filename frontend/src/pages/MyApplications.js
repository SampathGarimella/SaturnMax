import React from "react";
import { useOutletContext, Link } from "react-router-dom";

const STATUS_META = {
  under_review: { label: "Under review", className: "bg-amber-100 text-amber-800" },
  interview: { label: "Interview", className: "bg-emerald-100 text-emerald-800" },
  pending: { label: "Pending", className: "bg-slate-100 text-slate-700" },
  not_shortlisted: { label: "Not shortlisted", className: "bg-rose-100 text-rose-800" },
  offer: { label: "Offer", className: "bg-blue-100 text-blue-800" },
};

export default function MyApplications() {
  const { data, loading } = useOutletContext();

  if (loading || !data) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-5" data-testid="my-applications-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          My applications
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Track the status of every role you've applied to.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] px-6 py-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">
          <div>Position</div>
          <div>Applied</div>
          <div>Experience</div>
          <div className="text-right">Status</div>
        </div>
        {data.applications.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            You haven't applied to any roles yet.{" "}
            <Link to="/dashboard/jobs" className="text-[#2563EB] font-medium hover:text-[#1D4ED8]">
              Browse open jobs →
            </Link>
          </div>
        )}
        {data.applications.map((a) => {
          const meta = STATUS_META[a.status] || STATUS_META.pending;
          return (
            <div
              key={a.id}
              className="grid grid-cols-[1.5fr_1fr_1fr_1fr] px-6 py-4 items-center text-sm border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
              data-testid={`app-row-${a.id}`}
            >
              <div className="font-semibold text-slate-900">{a.position_title}</div>
              <div className="text-slate-600">{a.applied_ago || "recently"}</div>
              <div className="text-slate-600">{a.years_experience} yrs</div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}
                >
                  {meta.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
