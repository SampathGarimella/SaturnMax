import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { ArrowRight, Briefcase, UploadCloud, X } from "lucide-react";
import { fetchJobs, markResumeUploaded, submitApplication, validateUploadFile } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const TAG_STYLES = {
  "Full-time": "bg-slate-100 text-slate-700",
  Remote: "bg-emerald-50 text-emerald-700",
  "Remote USA": "bg-emerald-50 text-emerald-700",
  Hybrid: "bg-sky-50 text-sky-700",
  Contract: "bg-violet-50 text-violet-700",
  Freelance: "bg-violet-50 text-violet-700",
  "Hot role": "bg-amber-50 text-amber-700",
  Urgent: "bg-rose-50 text-rose-700",
  "15% commission": "bg-amber-50 text-amber-700",
  "US project": "bg-blue-50 text-blue-700",
};

function tagClass(tag) {
  if (TAG_STYLES[tag]) return TAG_STYLES[tag];
  return "bg-slate-50 text-slate-600";
}

export default function BrowseJobs() {
  const { data, reload } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const candidate = data?.candidate || {};
  const [form, setForm] = useState(() => buildApplicationForm(candidate));
  const draftKey = selectedJob?.id && user?.uid ? `saturnmax.applicationDraft.${user.uid}.${selectedJob.id}` : "";

  useEffect(() => {
    fetchJobs()
      .then((nextJobs) => {
        setJobs(nextJobs);
        const applyJob = searchParams.get("applyJob");
        if (applyJob) {
          const match = nextJobs.find((job) => job.id === applyJob);
          if (match) openApply(match);
        }
      })
      .catch(() => toast.error("Couldn't load jobs."))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const base = buildApplicationForm(candidate);
    setForm((current) =>
      Object.keys(base).reduce((acc, key) => {
        acc[key] = current[key] || base[key];
        return acc;
      }, {})
    );
  }, [candidate?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const existingApplicationJobIds = useMemo(
    () => new Set((data?.applications || []).map((application) => application.position_id).filter(Boolean)),
    [data?.applications]
  );

  const openApply = (job) => {
    const savedDraftKey = user?.uid ? `saturnmax.applicationDraft.${user.uid}.${job.id}` : "";
    let savedDraft = {};
    if (savedDraftKey) {
      try {
        savedDraft = JSON.parse(window.localStorage.getItem(savedDraftKey) || "{}");
      } catch {
        savedDraft = {};
      }
    }
    setSelectedJob(job);
    setForm((current) => ({
      ...buildApplicationForm(candidate),
      ...current,
      ...savedDraft,
      full_name: current.full_name || candidate.name || user?.name || "",
      email: current.email || candidate.email || user?.email || "",
      position_title: job.title,
      position_id: job.id,
    }));
  };

  const closeApply = () => {
    setSelectedJob(null);
    setResumeFile(null);
    setSearchParams({});
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    if (!draftKey || !selectedJob) return;
    const draft = { ...form, position_id: selectedJob.id, position_title: selectedJob.title };
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, form, selectedJob]);

  const handleResumeSelect = (file) => {
    if (!file) {
      setResumeFile(null);
      return;
    }
    try {
      validateUploadFile(file, { allowedExtensions: new Set(["pdf", "doc", "docx"]) });
      setResumeFile(file);
    } catch (err) {
      setResumeFile(null);
      toast.error(err?.message || "Choose a PDF, DOC, or DOCX resume under 5 MB.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedJob) return;
    if (!form.full_name || !form.email || !form.phone) {
      toast.error("Complete name, email, and phone before applying.");
      return;
    }
    if (!resumeFile && !candidate.resume_url) {
      toast.error("Upload a resume from this form or your profile before applying.");
      return;
    }
    setSubmitting(true);
    try {
      let resumeUrl = candidate.resume_url || "";
      if (resumeFile) {
        const uploaded = await markResumeUploaded({ file: resumeFile, candidateUid: user.uid });
        resumeUrl = uploaded.file_url;
      }
      await submitApplication({
        ...form,
        resume_url: resumeUrl,
        position_id: selectedJob.id,
        position_title: selectedJob.title,
      });
      toast.success("Application submitted.");
      if (draftKey) window.localStorage.removeItem(draftKey);
      window.sessionStorage.removeItem("saturnmax.pendingApplyJob");
      closeApply();
      reload?.();
    } catch (err) {
      toast.error(err?.message || "Could not submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="browse-jobs-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          Browse jobs
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Open positions curated for you by SaturnMax Technologies.
        </p>
      </div>
      {loading ? (
        <div className="text-sm text-slate-500">Loading roles...</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          No open roles are published right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#2563EB]/30 hover:shadow-md transition-all flex flex-col"
              data-testid={`browse-job-${job.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#2563EB] font-semibold">
                    <Briefcase className="h-3 w-3" />
                    {job.department}
                  </div>
                  <h3 className="mt-2 font-heading text-lg font-semibold text-slate-900">
                    {job.title}
                  </h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {job.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.tags.map((t) => (
                  <span
                    key={t}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tagClass(t)}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (existingApplicationJobIds.has(job.id)) {
                      navigate("/dashboard/applications");
                      return;
                    }
                    openApply(job);
                  }}
                  className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] disabled:text-slate-400 inline-flex items-center gap-1"
                  data-testid={`browse-job-apply-${job.id}`}
                >
                  {existingApplicationJobIds.has(job.id) ? "Applied - view status" : "Apply now"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-slate-400">{job.employment_type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedJob && (
        <section className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 px-4 py-6" role="presentation">
          <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl md:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-apply-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563EB]">Job application</div>
                <h3 id="job-apply-title" className="font-heading text-2xl font-semibold text-slate-900">{selectedJob.title}</h3>
                <p className="mt-1 text-sm text-slate-500">Review your profile details and submit this job application.</p>
              </div>
              <button type="button" onClick={closeApply} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Close application">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Full name"><input required className={inputClass} value={form.full_name} onChange={(e) => updateForm("full_name", e.target.value)} /></Field>
              <Field label="Email"><input required type="email" className={inputClass} value={form.email} onChange={(e) => updateForm("email", e.target.value)} /></Field>
              <Field label="Phone"><input required className={inputClass} value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} /></Field>
              <Field label="Current location"><input className={inputClass} value={form.current_location} onChange={(e) => updateForm("current_location", e.target.value)} /></Field>
              <Field label="Current company"><input className={inputClass} value={form.current_company} onChange={(e) => updateForm("current_company", e.target.value)} /></Field>
              <Field label="Years of experience">
                <select className={inputClass} value={form.years_experience} onChange={(e) => updateForm("years_experience", e.target.value)}>
                  {["0-1", "1-3", "3-5", "5-8", "8+"].map((value) => <option key={value} value={value}>{value} years</option>)}
                </select>
              </Field>
              <Field label="Notice period">
                <select className={inputClass} value={form.notice_period} onChange={(e) => updateForm("notice_period", e.target.value)}>
                  {["Immediate", "15 days", "30 days", "45 days", "60 days", "90 days", "Serving notice"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </Field>
              <Field label="Preferred work mode">
                <select className={inputClass} value={form.preferred_work_mode} onChange={(e) => updateForm("preferred_work_mode", e.target.value)}>
                  {["Remote", "Hybrid", "On-site", "Flexible"].map((value) => <option key={value}>{value}</option>)}
                </select>
              </Field>
              <Field label="Current CTC (LPA)"><input className={inputClass} value={form.current_ctc_lpa} onChange={(e) => updateForm("current_ctc_lpa", e.target.value)} /></Field>
              <Field label="Expected CTC (LPA)"><input className={inputClass} value={form.expected_ctc_lpa} onChange={(e) => updateForm("expected_ctc_lpa", e.target.value)} /></Field>
              <Field label="LinkedIn / Portfolio"><input className={inputClass} value={form.portfolio_url} onChange={(e) => updateForm("portfolio_url", e.target.value)} /></Field>
              <Field label="Resume">
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-700 hover:bg-slate-50">
                  <UploadCloud className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{resumeFile ? resumeFile.name : candidate.resume_url ? "Resume on profile, or upload a new one" : "Upload PDF, DOC, or DOCX under 5 MB"}</span>
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleResumeSelect(e.target.files?.[0] || null)} />
                </label>
                <span className="mt-1 block text-[11px] text-slate-500">Allowed: PDF, DOC, DOCX. Maximum size: 5 MB.</span>
              </Field>
              <Field label="Primary skills" className="md:col-span-2"><input className={inputClass} value={form.primary_skills} onChange={(e) => updateForm("primary_skills", e.target.value)} /></Field>
              <Field label="Brief introduction" className="md:col-span-2"><textarea rows={4} className={`${inputClass} h-28 resize-none py-3`} value={form.introduction} onChange={(e) => updateForm("introduction", e.target.value)} /></Field>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              By applying, you agree that SaturnMax Technologies may use your profile, resume, application, and contact details for hiring, consulting, and communication purposes. Your draft is saved on this device until submitted.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={closeApply} disabled={submitting} className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit application"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function buildApplicationForm(candidate = {}) {
  return {
    full_name: candidate.name || "",
    email: candidate.email || "",
    phone: candidate.phone || "",
    years_experience: candidate.years_experience || "0-1",
    position_title: "",
    position_id: "",
    portfolio_url: candidate.portfolio_url || "",
    resume_url: candidate.resume_url || "",
    current_location: candidate.current_location || "",
    current_company: candidate.current_company || "",
    notice_period: candidate.notice_period || "30 days",
    current_ctc_lpa: candidate.current_ctc_lpa || "",
    expected_ctc_lpa: candidate.expected_ctc_lpa || "",
    preferred_work_mode: candidate.preferred_work_mode || "Remote",
    primary_skills: candidate.primary_skills || "",
    introduction: candidate.introduction || "",
  };
}

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
