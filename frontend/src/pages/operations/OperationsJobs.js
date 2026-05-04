import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { BriefcaseBusiness, Plus } from "lucide-react";
import {
  ActionBar,
  ConfirmModal,
  EmptyState,
  SearchInput,
  SectionHeader,
  StatusBadge,
} from "../../components/ui";
import { deleteJob, saveJob, updateJobStatus } from "../../lib/api";
import { useOperations } from "./OperationsContext";
import { sortRecent, textIncludes } from "./operationsUtils";

const EMPTY_JOB = {
  id: "",
  title: "",
  department: "Engineering",
  employment_type: "Full-time",
  work_mode: "Remote",
  owner: "",
  clientName: "",
  priority: "Medium",
  hiringType: "Full-time",
  location: "Remote",
  experience: "2-5 yrs exp",
  tags: "Full-time, Remote",
  description: "",
  status: "published",
};

export default function OperationsJobs() {
  const { data, busy, setBusy, load, showMutationError } = useOperations();
  const [jobForm, setJobForm] = useState(EMPTY_JOB);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const jobs = useMemo(() => {
    return sortRecent(data.jobs)
      .filter((job) => status === "all" || job.status === status)
      .filter((job) => textIncludes(job, query, ["title", "department", "description", "employment_type", "work_mode"]));
  }, [data.jobs, query, status]);
  const jobCounts = useMemo(() => {
    return (data.applications || []).reduce((acc, application) => {
      const id = application.position_id;
      if (!id) return acc;
      acc[id] = acc[id] || { total: 0, review: 0, converted: 0 };
      acc[id].total += 1;
      if (["screening", "interview", "selected"].includes(application.status)) acc[id].review += 1;
      if (application.status === "consultant_active" || application.convertedToConsultantId) acc[id].converted += 1;
      return acc;
    }, {});
  }, [data.applications]);

  const handleSaveJob = async (event) => {
    event.preventDefault();
    setBusy("job");
    try {
      await saveJob(jobForm);
      toast.success(jobForm.id ? "Job updated." : "Job posted.");
      setJobForm(EMPTY_JOB);
      await load();
    } catch (err) {
      showMutationError(err, "Could not save job.");
    } finally {
      setBusy("");
    }
  };

  const handleJobStatus = async (job, nextStatus) => {
    setBusy(`${job.id}-${nextStatus}`);
    try {
      await updateJobStatus(job.id, nextStatus);
      toast.success(`Job marked ${nextStatus}.`);
      await load();
    } catch (err) {
      showMutationError(err, "Could not update job status.");
    } finally {
      setBusy("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(`${deleteTarget.id}-delete`);
    try {
      await deleteJob(deleteTarget.id);
      toast.success("Job archived.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showMutationError(err, "Could not delete job.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5" data-testid="operations-jobs-page">
      <SectionHeader
        eyebrow="Jobs"
        title="Post and manage website jobs"
        description="Published jobs appear on the public careers section and can be applied to by candidate accounts."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <form onSubmit={handleSaveJob} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Job title">
            <input className={inputClass} value={jobForm.title} onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Department">
            <input className={inputClass} value={jobForm.department} onChange={(e) => setJobForm((f) => ({ ...f, department: e.target.value }))} />
          </Field>
          <Field label="Employment type">
            <select className={inputClass} value={jobForm.employment_type} onChange={(e) => setJobForm((f) => ({ ...f, employment_type: e.target.value }))}>
              <option>Full-time</option>
              <option>Contract</option>
              <option>Freelance</option>
            </select>
          </Field>
          <Field label="Work mode">
            <select className={inputClass} value={jobForm.work_mode} onChange={(e) => setJobForm((f) => ({ ...f, work_mode: e.target.value }))}>
              <option>Remote</option>
              <option>Hybrid</option>
              <option>On-site</option>
            </select>
          </Field>
          <Field label="Experience">
            <input className={inputClass} value={jobForm.experience} onChange={(e) => setJobForm((f) => ({ ...f, experience: e.target.value }))} />
          </Field>
          <Field label="Internal owner">
            <input className={inputClass} value={jobForm.owner} onChange={(e) => setJobForm((f) => ({ ...f, owner: e.target.value }))} />
          </Field>
          <Field label="Client name">
            <input className={inputClass} value={jobForm.clientName} onChange={(e) => setJobForm((f) => ({ ...f, clientName: e.target.value }))} />
          </Field>
          <Field label="Priority">
            <select className={inputClass} value={jobForm.priority} onChange={(e) => setJobForm((f) => ({ ...f, priority: e.target.value }))}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </Field>
          <Field label="Hiring type">
            <select className={inputClass} value={jobForm.hiringType} onChange={(e) => setJobForm((f) => ({ ...f, hiringType: e.target.value }))}>
              <option>Full-time</option>
              <option>Contract</option>
              <option>Bench</option>
              <option>Client-assigned</option>
            </select>
          </Field>
          <Field label="Location">
            <input className={inputClass} value={jobForm.location} onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))} />
          </Field>
          <Field label="Tags">
            <input className={inputClass} value={jobForm.tags} onChange={(e) => setJobForm((f) => ({ ...f, tags: e.target.value }))} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={jobForm.status} onChange={(e) => setJobForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea className={`${inputClass} h-28 resize-none py-3`} value={jobForm.description} onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {jobForm.id && (
              <button type="button" onClick={() => setJobForm(EMPTY_JOB)} className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Clear edit
              </button>
            )}
            <button disabled={busy === "job"} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {busy === "job" ? "Saving..." : jobForm.id ? "Update job" : "Post job"}
            </button>
          </div>
        </form>
      </section>

      <ActionBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search jobs by role, department, or description" />
        <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter jobs by status">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </ActionBar>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {jobs.length === 0 && (
          <EmptyState title="No jobs match this view" body="Change filters or post a new role." Icon={BriefcaseBusiness} className="lg:col-span-2" />
        )}
        {jobs.map((job) => (
          <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            {(() => {
              const counts = jobCounts[job.id] || { total: 0, review: 0, converted: 0 };
              return (
                <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-semibold text-slate-900">{job.title}</h2>
                <div className="mt-1 text-xs text-slate-500">{job.department} / {job.employment_type} / {job.work_mode}</div>
                <div className="mt-1 text-xs text-slate-400">Owner: {job.owner || "Unassigned"} / Client: {job.clientName || "Internal"} / Priority: {job.priority || "Medium"}</div>
              </div>
              <StatusBadge value={job.status} />
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{job.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <MiniCount label="Applied" value={counts.total} />
              <MiniCount label="In review" value={counts.review} />
              <MiniCount label="Converted" value={counts.converted} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setJobForm({ ...job, tags: (job.tags || []).join(", ") })} className={smallButtonClass}>
                Edit
              </button>
              {["published", "paused", "closed", "archived"].map((nextStatus) => (
                <button key={nextStatus} onClick={() => handleJobStatus(job, nextStatus)} disabled={busy === `${job.id}-${nextStatus}`} className={smallButtonClass}>
                  {busy === `${job.id}-${nextStatus}` ? "Saving..." : nextStatus}
                </button>
              ))}
              <button onClick={() => setDeleteTarget(job)} disabled={busy === `${job.id}-delete`} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                Archive
              </button>
            </div>
                </>
              );
            })()}
          </article>
        ))}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Archive job?"
        body={deleteTarget ? `This closes "${deleteTarget.title}" on the public site while keeping applications and audit history safe.` : ""}
        confirmLabel="Archive job"
        destructive
        busy={Boolean(busy && busy.endsWith("-delete"))}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

const smallButtonClass =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function MiniCount({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="font-heading text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
