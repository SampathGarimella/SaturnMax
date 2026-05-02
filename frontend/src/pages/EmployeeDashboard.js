import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  FileText,
  Plus,
  RefreshCw,
  Send,
  UploadCloud,
  UserCog,
  Users,
  X,
} from "lucide-react";
import Logo from "../components/Logo";
import {
  APPLICATION_STAGES,
  fetchOperationsData,
  saveJob,
  updateJobStatus,
  deleteJob,
  updateApplicationStatus,
  sendOfferLetter,
  uploadOnboardingDocument,
  convertToConsultant,
  updateConsultantProfile,
  resolveReview,
} from "../lib/api";

const EMPTY_JOB = {
  id: "",
  title: "",
  department: "Engineering",
  employment_type: "Full-time",
  work_mode: "Remote",
  experience: "2-5 yrs exp",
  tags: "Full-time, Remote",
  description: "",
  status: "published",
};

const EMPTY_CONSULTANT = {
  uid: "",
  client: "",
  project: "",
  monthlyPay: "",
  startDate: "",
};

const STAGE_LABELS = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  selected: "Selected",
  offer_sent: "Offer sent",
  offer_signed: "Offer signed",
  onboarding: "Onboarding",
  consultant_active: "Consultant active",
  not_shortlisted: "Not shortlisted",
};

export default function EmployeeDashboard() {
  const [data, setData] = useState({
    jobs: [],
    applications: [],
    candidates: [],
    consultants: [],
    reviews: [],
    documents: [],
    leads: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [jobForm, setJobForm] = useState(EMPTY_JOB);
  const [consultantForm, setConsultantForm] = useState(EMPTY_CONSULTANT);
  const pendingReviews = useMemo(
    () => data.reviews.filter((review) => review.status === "pending_review"),
    [data.reviews]
  );

  const stats = useMemo(
    () => [
      { label: "Published jobs", value: data.jobs.filter((job) => job.status === "published").length },
      { label: "Applications", value: data.applications.length },
      { label: "Consultants", value: data.consultants.length },
      { label: "Pending reviews", value: pendingReviews.length },
    ],
    [data, pendingReviews.length]
  );

  const load = async () => {
    setLoading(true);
    try {
      setData(await fetchOperationsData());
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Could not load operations data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveJob = async (e) => {
    e.preventDefault();
    setBusy("job");
    try {
      await saveJob(jobForm);
      toast.success(jobForm.id ? "Job updated." : "Job posted.");
      setJobForm(EMPTY_JOB);
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not save job.");
    } finally {
      setBusy("");
    }
  };

  const handleStatus = async (application, status) => {
    setBusy(`${application.id}-status`);
    try {
      await updateApplicationStatus(application, status);
      toast.success("Application status updated.");
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not update application.");
    } finally {
      setBusy("");
    }
  };

  const handleOfferUpload = async (application, file) => {
    if (!file) return;
    setBusy(`${application.id}-offer`);
    try {
      await sendOfferLetter(application, file);
      toast.success("Offer letter sent to candidate portal.");
      await load();
    } catch (err) {
      toast.error(err?.message || "Offer upload failed.");
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
      toast.error(err?.message || "Document upload failed.");
    } finally {
      setBusy("");
    }
  };

  const handleConvert = async (application) => {
    setBusy(`${application.id}-convert`);
    try {
      await convertToConsultant(application);
      toast.success("Candidate converted to consultant. Ask them to sign in through Consultant login.");
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not convert candidate.");
    } finally {
      setBusy("");
    }
  };

  const handleConsultantUpdate = async (e) => {
    e.preventDefault();
    if (!consultantForm.uid) {
      toast.error("Choose a consultant first.");
      return;
    }
    setBusy("consultant");
    try {
      await updateConsultantProfile(consultantForm.uid, {
        client: consultantForm.client,
        project: consultantForm.project,
        monthlyPay: consultantForm.monthlyPay,
        startDate: consultantForm.startDate,
        status: "Active consultant",
      });
      toast.success("Consultant assignment updated.");
      setConsultantForm(EMPTY_CONSULTANT);
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not update consultant.");
    } finally {
      setBusy("");
    }
  };

  const handleReview = async (review, status) => {
    setBusy(`${review.id}-${status}`);
    try {
      await resolveReview(review, status);
      toast.success(status === "approved" ? "Review approved." : "Review rejected.");
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not update review.");
    } finally {
      setBusy("");
    }
  };

  const chooseConsultant = (uid) => {
    const consultant = data.consultants.find((item) => item.uid === uid || item.id === uid);
    setConsultantForm({
      uid,
      client: consultant?.client || "",
      project: consultant?.project || "",
      monthlyPay: consultant?.monthlyPay || "",
      startDate: consultant?.startDate || "",
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 min-h-16 py-2 flex items-center justify-between gap-3">
          <Logo to="/employee-dashboard" />
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#2563EB] font-medium">
              <ArrowLeft className="h-4 w-4" />
              Website
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-5">
          <div className="rounded-2xl bg-[#0A192F] p-7 md:p-8 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              <UserCog className="h-3.5 w-3.5" />
              Operations command center
            </div>
            <h1 className="mt-5 font-heading text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Hiring, onboarding, consultants, and reviews in one workflow.
            </h1>
            <p className="mt-4 text-sm text-white/65 leading-relaxed">
              Post jobs, move applicants through interviews and offers, publish documents,
              activate consultants, and approve India payroll readiness.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
                  {stat.label}
                </div>
                <div className="mt-3 font-heading text-4xl font-bold text-slate-900">
                  {loading ? "..." : stat.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-5">
          <Panel title="Post or edit jobs" subtitle="Published jobs appear on the public careers section">
            <form onSubmit={handleSaveJob} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Field label="Tags">
                <input className={inputClass} value={jobForm.tags} onChange={(e) => setJobForm((f) => ({ ...f, tags: e.target.value }))} />
              </Field>
              <Field label="Status">
                <select className={inputClass} value={jobForm.status} onChange={(e) => setJobForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
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
                  <Plus className="h-4 w-4" />
                  {jobForm.id ? "Update job" : "Post job"}
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Website jobs" subtitle="Manage public visibility">
            <div className="space-y-3 max-h-[520px] overflow-y-auto">
              {data.jobs.length === 0 && <EmptyState>No jobs yet. Post your first role.</EmptyState>}
              {data.jobs.map((job) => (
                <div key={job.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{job.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{job.department} / {job.employment_type} / {job.work_mode}</div>
                    </div>
                    <StatusPill value={job.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600 line-clamp-2">{job.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => setJobForm({ ...job, tags: (job.tags || []).join(", ") })} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      Edit
                    </button>
                    {["published", "paused", "closed"].map((status) => (
                      <button key={status} onClick={() => updateJobStatus(job.id, status).then(load)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        {status}
                      </button>
                    ))}
                    <button onClick={() => deleteJob(job.id).then(load)} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <Panel title="Applications pipeline" subtitle="Move candidates from applied to consultant activation">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <div className="min-w-[1080px]">
              <div className="grid grid-cols-[1.2fr_1.1fr_0.9fr_1.8fr] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <div>Candidate</div>
                <div>Role</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              {data.applications.length === 0 && <EmptyState className="m-4">No applications yet.</EmptyState>}
              {data.applications.map((application) => (
                <div key={application.id} className="grid grid-cols-[1.2fr_1.1fr_0.9fr_1.8fr] gap-3 border-t border-slate-100 bg-white px-4 py-4 text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">{application.full_name || application.candidate_name}</div>
                    <div className="text-xs text-slate-500">{application.email}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{application.position_title}</div>
                    <div className="text-xs text-slate-500">{application.years_experience} yrs / {application.notice_period}</div>
                  </div>
                  <div>
                    <select
                      value={application.status}
                      onChange={(e) => handleStatus(application, e.target.value)}
                      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
                    >
                      {[...APPLICATION_STAGES, "not_shortlisted"].map((stage) => (
                        <option key={stage} value={stage}>{STAGE_LABELS[stage] || stage}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FileButton label={busy === `${application.id}-offer` ? "Uploading..." : "Send offer"} onFile={(file) => handleOfferUpload(application, file)} />
                    <FileButton label="Form 12BB" onFile={(file) => handleOnboardingUpload(application, file, "form12bb")} />
                    <FileButton label="Onboarding" onFile={(file) => handleOnboardingUpload(application, file, "onboarding_pack")} />
                    <button onClick={() => handleConvert(application)} className="inline-flex h-9 items-center gap-1 rounded-md bg-[#0A192F] px-3 text-xs font-semibold text-white hover:bg-[#0e2445]">
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                      Activate consultant
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <section className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-5">
          <Panel title="Consultant assignments" subtitle="Update client, project, start date, and monthly pay">
            <form onSubmit={handleConsultantUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Consultant">
                <select className={inputClass} value={consultantForm.uid} onChange={(e) => chooseConsultant(e.target.value)}>
                  <option value="">Choose consultant</option>
                  {data.consultants.map((consultant) => (
                    <option key={consultant.uid || consultant.id} value={consultant.uid || consultant.id}>
                      {consultant.name || consultant.email}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Client">
                <input className={inputClass} value={consultantForm.client} onChange={(e) => setConsultantForm((f) => ({ ...f, client: e.target.value }))} />
              </Field>
              <Field label="Project">
                <input className={inputClass} value={consultantForm.project} onChange={(e) => setConsultantForm((f) => ({ ...f, project: e.target.value }))} />
              </Field>
              <Field label="Monthly pay">
                <input className={inputClass} value={consultantForm.monthlyPay} onChange={(e) => setConsultantForm((f) => ({ ...f, monthlyPay: e.target.value }))} placeholder="INR 1,80,000" />
              </Field>
              <Field label="Start date">
                <input className={inputClass} value={consultantForm.startDate} onChange={(e) => setConsultantForm((f) => ({ ...f, startDate: e.target.value }))} placeholder="June 1, 2026" />
              </Field>
              <div className="md:col-span-2 flex justify-end">
                <button disabled={busy === "consultant"} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60 md:w-auto">
                  <Send className="h-4 w-4" />
                  Update consultant
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Review queue" subtitle="Approve signed documents, bank details, PAN, UAN, and payroll readiness">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingReviews.length === 0 && <EmptyState>No pending reviews.</EmptyState>}
              {pendingReviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{review.title || review.type}</div>
                      <div className="mt-1 text-xs text-slate-500">{review.details || review.owner_uid}</div>
                    </div>
                    <StatusPill value={review.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => handleReview(review, "approved")} className="inline-flex h-9 items-center gap-1 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button onClick={() => handleReview(review, "rejected")} className="inline-flex h-9 items-center gap-1 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700">
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <OpsCard Icon={Users} title="Candidates" body={`${data.candidates.length} candidate profiles`} />
          <OpsCard Icon={ClipboardList} title="Leads" body={`${data.leads.length} website enquiries`} />
          <OpsCard Icon={FileText} title="Documents" body={`${data.documents.length} tracked files`} />
        </section>
      </main>
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
      <div className="mb-5">
        <h2 className="font-heading text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ children, className = "" }) {
  return (
    <div className={`rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500 ${className}`}>
      {children}
    </div>
  );
}

function StatusPill({ value }) {
  const color = value === "published" || value === "approved" || value === "consultant_active"
    ? "bg-emerald-50 text-emerald-700"
    : value === "pending_review" || value === "paused"
    ? "bg-amber-50 text-amber-700"
    : value === "rejected" || value === "closed"
    ? "bg-rose-50 text-rose-700"
    : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${color}`}>
      {String(value || "new").replace(/_/g, " ")}
    </span>
  );
}

function FileButton({ label, onFile }) {
  return (
    <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
      <UploadCloud className="h-3.5 w-3.5" />
      {label}
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
    </label>
  );
}

function OpsCard({ Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
