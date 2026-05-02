import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { BriefcaseBusiness, ClipboardList, UploadCloud } from "lucide-react";
import {
  ActionBar,
  EmptyState,
  InlineError,
  SearchInput,
  SectionHeader,
  StatusBadge,
} from "../../components/ui";
import {
  convertToConsultant,
  sendOfferLetter,
  updateApplicationStatus,
  uploadOnboardingDocument,
} from "../../lib/api";
import {
  APPLICATION_STATUS_VALUES,
  getApplicationStatusMeta,
  validateActivationChecklist,
} from "../../lib/workflow";
import { useOperations } from "./OperationsContext";
import {
  applicationBlockedActivation,
  applicationNeedsCandidateAction,
  sortRecent,
  textIncludes,
} from "./operationsUtils";

const PRESETS = [
  { id: "all", label: "All" },
  { id: "pending_review", label: "Pending review" },
  { id: "blocked_activation", label: "Blocked activation" },
  { id: "needs_candidate_action", label: "Needs candidate action" },
  { id: "recent", label: "Recently updated" },
];

export default function OperationsApplications() {
  const { data, busy, setBusy, load, workflowContextFor, showMutationError } = useOperations();
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState("all");
  const [status, setStatus] = useState("all");
  const [inlineError, setInlineError] = useState(null);

  const applications = useMemo(() => {
    return sortRecent(data.applications)
      .filter((app) => status === "all" || app.status === status)
      .filter((app) => {
        if (preset === "pending_review") return ["offer_signed", "onboarding"].includes(app.status);
        if (preset === "blocked_activation") return applicationBlockedActivation(app, data.documents, data.reviews);
        if (preset === "needs_candidate_action") return applicationNeedsCandidateAction(app);
        if (preset === "recent") return true;
        return true;
      })
      .filter((app) =>
        textIncludes(app, query, ["full_name", "candidate_name", "email", "position_title", "primary_skills"])
      );
  }, [data.applications, data.documents, data.reviews, preset, query, status]);

  const handleStatus = async (application, nextStatus) => {
    setInlineError(null);
    setBusy(`${application.id}-status`);
    try {
      await updateApplicationStatus(application, nextStatus, workflowContextFor(application));
      toast.success("Application status updated.");
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Could not update application."));
    } finally {
      setBusy("");
    }
  };

  const handleOfferUpload = async (application, file) => {
    if (!file) return;
    setInlineError(null);
    setBusy(`${application.id}-offer`);
    try {
      await sendOfferLetter(application, file);
      toast.success("Offer letter sent to candidate portal.");
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Offer upload failed."));
    } finally {
      setBusy("");
    }
  };

  const handleOnboardingUpload = async (application, file, docType) => {
    if (!file) return;
    setBusy(`${application.id}-${docType}`);
    try {
      await uploadOnboardingDocument(application, file, docType);
      toast.success("Onboarding document added.");
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Document upload failed."));
    } finally {
      setBusy("");
    }
  };

  const handleConvert = async (application) => {
    setInlineError(null);
    setBusy(`${application.id}-convert`);
    try {
      await convertToConsultant(application, {}, workflowContextFor(application));
      toast.success("Candidate converted to consultant.");
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Could not convert candidate."));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5" data-testid="operations-applications-page">
      <SectionHeader
        eyebrow="Applications"
        title="Hiring pipeline"
        description="Move candidates through the canonical lifecycle, send documents, and activate consultants only after required approvals are complete."
      />

      <ActionBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search candidate, email, role, or skills" />
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter applications by status">
          <option value="all">All statuses</option>
          {APPLICATION_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>{getApplicationStatusMeta(value).label}</option>
          ))}
        </select>
      </ActionBar>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Application saved views">
        {PRESETS.map((view) => (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={preset === view.id}
            onClick={() => setPreset(view.id)}
            className={`h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${
              preset === view.id ? "bg-[#2563EB] text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {inlineError && <InlineError title={inlineError.title} body={inlineError.body} onRetry={() => setInlineError(null)} />}

      <div className="grid grid-cols-1 gap-3">
        {applications.length === 0 && (
          <EmptyState title="No applications match this view" body="Try another saved view or search term." Icon={ClipboardList} />
        )}
        {applications.map((application) => {
          const activation = validateActivationChecklist({
            application,
            documents: data.documents,
            reviews: data.reviews,
          });
          return (
            <article key={application.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.85fr_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold text-slate-900">
                      {application.full_name || application.candidate_name || "Candidate"}
                    </h2>
                    <StatusBadge value={application.status} />
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{application.email}</div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">{application.position_title}</div>
                  <p className="mt-1 text-sm text-slate-500">{application.years_experience || "0"} yrs / {application.notice_period || "notice period not set"}</p>
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                    {application.status_next_action || getApplicationStatusMeta(application.status).nextAction}
                  </p>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activation checklist</div>
                  {activation.checklist.map((item) => (
                    <div key={item.type} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-700">{item.label}</span>
                      <span className={item.complete ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                        {item.complete ? "Done" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  <select value={application.status} onChange={(e) => handleStatus(application, e.target.value)} className={selectClass} aria-label={`Change status for ${application.full_name || application.candidate_name}`}>
                    {APPLICATION_STATUS_VALUES.map((stage) => (
                      <option key={stage} value={stage}>{getApplicationStatusMeta(stage).label}</option>
                    ))}
                  </select>
                  <FileButton label={busy === `${application.id}-offer` ? "Uploading..." : "Send offer"} onFile={(file) => handleOfferUpload(application, file)} />
                  <FileButton label="Form 12BB" onFile={(file) => handleOnboardingUpload(application, file, "form12bb")} />
                  <FileButton label="Onboarding" onFile={(file) => handleOnboardingUpload(application, file, "onboarding_pack")} />
                  <button
                    onClick={() => handleConvert(application)}
                    disabled={busy === `${application.id}-convert`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0A192F] px-3 text-xs font-semibold text-white hover:bg-[#0e2445] disabled:opacity-60"
                  >
                    <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />
                    {busy === `${application.id}-convert` ? "Checking..." : "Activate"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const selectClass =
  "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]";

function FileButton({ label, onFile }) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
      <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
    </label>
  );
}
