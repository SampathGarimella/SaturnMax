import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { BriefcaseBusiness } from "lucide-react";
import { EmptyState, SectionHeader, StatusBadge } from "../../components/ui";
import { useOperations } from "./OperationsContext";
import { buildHiringRows } from "./OperationsHiringCandidates";
import { humanDate } from "./operationsUtils";

export default function OperationsConvert() {
  const { data } = useOperations();
  const rows = useMemo(() => {
    return buildHiringRows(data).filter(
      (row) => !row.isProfileOnly && !row.convertedToConsultantId && row.candidateApprovalStatus === "approved"
    );
  }, [data]);

  return (
    <div className="space-y-5" data-testid="operations-convert-page">
      <SectionHeader
        eyebrow="Hiring Workflow"
        title="Convert to Consultant"
        description="Approved candidates ready for consultant setup, assignment details, and prepared portal invite copy."
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rows.length === 0 && (
          <EmptyState
            title="No approved candidates ready for conversion"
            body="Approve a candidate from the Candidates queue, then return here to complete consultant setup."
            Icon={BriefcaseBusiness}
            className="lg:col-span-2"
          />
        )}
        {rows.map((row) => (
          <article key={row.key} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-slate-900">{row.name}</h2>
                <div className="mt-1 text-xs text-slate-500">{row.email}</div>
              </div>
              <StatusBadge value={row.workflowStage} type="hiring" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Mini label="Role" value={row.application.position_title || "Consultant"} />
              <Mini label="Skills" value={row.skills || "Not provided"} />
              <Mini label="Last updated" value={humanDate(row.updatedAt)} />
              <Mini label="Decision" value={row.candidateApprovalStatus} />
            </div>
            <Link
              to={`/employee-dashboard/hiring/candidates/${row.key}`}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
            >
              Open conversion panel
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
