import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Mail, Phone, Link2, FileUp, CheckCircle2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { isFirebaseConfigured } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { markResumeUploaded, updateCandidateProfile } from "../lib/api";

const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function MyProfile() {
  const { data, loading, reload } = useOutletContext();
  const { user, mode } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(null); // 0..100
  const [resumeUrl, setResumeUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState(null);

  if (loading || !data)
    return <div className="text-sm text-slate-500">Loading profile...</div>;

  const canUpload = isFirebaseConfigured && mode === "firebase" && user?.uid;

  const { candidate, stats } = data;

  const startEdit = () => {
    setProfileForm({
      name: candidate.name || "",
      email: candidate.email || user?.email || "",
      phone: candidate.phone || "",
      current_location: candidate.current_location || "",
      current_company: candidate.current_company || "",
      years_experience: candidate.years_experience || "0-1",
      notice_period: candidate.notice_period || "30 days",
      preferred_work_mode: candidate.preferred_work_mode || "Remote",
      current_ctc_lpa: candidate.current_ctc_lpa || "",
      expected_ctc_lpa: candidate.expected_ctc_lpa || "",
      portfolio_url: candidate.portfolio_url || "",
      primary_skills: candidate.primary_skills || "",
      introduction: candidate.introduction || "",
    });
    setEditing(true);
  };

  const updateField = (key, value) => {
    setProfileForm((current) => ({ ...current, [key]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateCandidateProfile(profileForm);
      toast.success("Tech profile updated.");
      setEditing(false);
      reload?.();
    } catch (err) {
      toast.error(err?.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset input so same file can be re-selected
    if (!file) return;

    if (!canUpload) {
      toast.info("Resume upload will be enabled after account verification.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is too large. Max 5MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      setUploadProgress(30);
      const uploaded = await markResumeUploaded({ file, candidateUid: user.uid });
      setUploadProgress(100);
      setResumeUrl(uploaded.file_url);
      toast.success("Resume uploaded successfully.");
      reload?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 800);
    }
  };

  return (
    <div className="space-y-6" data-testid="my-profile-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          My profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Keep your profile up to date. Recruiters view this when considering you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="avatar-ring">
                <div className="h-16 w-16 rounded-full bg-[#2563EB] text-white grid place-items-center text-lg font-semibold">
                  {(candidate.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("")).toUpperCase()}
                </div>
              </div>
              <div>
                <div className="font-heading text-xl font-semibold text-slate-900">
                  {candidate.name}
                </div>
                <div className="text-sm text-slate-500">{candidate.role_label}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Edit tech profile
            </button>
          </div>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow Icon={Mail} label="Email" value={candidate.email} />
            <InfoRow Icon={Phone} label="Phone" value={candidate.phone || "-"} />
            <InfoRow
              Icon={Link2}
              label="Portfolio"
              value={candidate.portfolio_url || "Add your LinkedIn or portfolio URL"}
            />
            <InfoRow
              Icon={FileUp}
              label="Resume"
              value={
                resumeUrl ? (
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#2563EB] hover:underline"
                  >
                    View uploaded resume
                  </a>
                ) : candidate.resume_uploaded ? (
                  "Uploaded"
                ) : (
                  "Not uploaded"
                )
              }
            />
          </div>

          {editing && profileForm && (
            <form onSubmit={saveProfile} className="mt-7 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Full name"><input className={inputClass} value={profileForm.name} onChange={(e) => updateField("name", e.target.value)} /></Field>
                <Field label="Email"><input className={inputClass} value={profileForm.email} onChange={(e) => updateField("email", e.target.value)} /></Field>
                <Field label="Phone"><input className={inputClass} value={profileForm.phone} onChange={(e) => updateField("phone", e.target.value)} /></Field>
                <Field label="Current location"><input className={inputClass} value={profileForm.current_location} onChange={(e) => updateField("current_location", e.target.value)} /></Field>
                <Field label="Current company"><input className={inputClass} value={profileForm.current_company} onChange={(e) => updateField("current_company", e.target.value)} /></Field>
                <Field label="Experience">
                  <select className={inputClass} value={profileForm.years_experience} onChange={(e) => updateField("years_experience", e.target.value)}>
                    {["0-1", "1-3", "3-5", "5-8", "8+"].map((value) => <option key={value} value={value}>{value} years</option>)}
                  </select>
                </Field>
                <Field label="Notice period"><input className={inputClass} value={profileForm.notice_period} onChange={(e) => updateField("notice_period", e.target.value)} /></Field>
                <Field label="Preferred work mode"><input className={inputClass} value={profileForm.preferred_work_mode} onChange={(e) => updateField("preferred_work_mode", e.target.value)} /></Field>
                <Field label="Current CTC (LPA)"><input className={inputClass} value={profileForm.current_ctc_lpa} onChange={(e) => updateField("current_ctc_lpa", e.target.value)} /></Field>
                <Field label="Expected CTC (LPA)"><input className={inputClass} value={profileForm.expected_ctc_lpa} onChange={(e) => updateField("expected_ctc_lpa", e.target.value)} /></Field>
                <Field label="LinkedIn / Portfolio" className="md:col-span-2"><input className={inputClass} value={profileForm.portfolio_url} onChange={(e) => updateField("portfolio_url", e.target.value)} /></Field>
                <Field label="Primary skills" className="md:col-span-2"><input className={inputClass} value={profileForm.primary_skills} onChange={(e) => updateField("primary_skills", e.target.value)} /></Field>
                <Field label="Brief introduction" className="md:col-span-2"><textarea className={`${inputClass} h-24 resize-none py-3`} value={profileForm.introduction} onChange={(e) => updateField("introduction", e.target.value)} /></Field>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setEditing(false)} disabled={saving} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </form>
          )}

          {/* Resume upload zone */}
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5" data-testid="resume-upload-zone">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileUp className="h-4 w-4 text-[#2563EB]" />
                  Upload resume
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  PDF, DOC, or DOCX · max 5MB
                </div>
              </div>
              <label
                htmlFor="resume-input"
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                  canUpload
                    ? "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
                data-testid="resume-upload-button"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" />
                    Choose file
                  </>
                )}
                <input
                  id="resume-input"
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading || !canUpload}
                  data-testid="resume-input"
                />
              </label>
            </div>
            {uploadProgress !== null && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {resumeUrl && (
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Resume saved.{" "}
                <a href={resumeUrl} target="_blank" rel="noreferrer" className="underline">
                  Open download link
                </a>
              </div>
            )}
            {!canUpload && (
              <div className="mt-3 text-xs text-amber-700">
                Upload access is currently unavailable for this account.
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="text-sm font-semibold text-slate-900">Profile strength</div>
          <div className="mt-4 flex items-end gap-3">
            <div className="font-heading text-5xl font-bold text-slate-900">
              {stats.profile_complete_percent}%
            </div>
            <div className="text-xs text-amber-600 font-medium mb-1.5">
              Complete more to stand out
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#2563EB] transition-all"
              style={{ width: `${stats.profile_complete_percent}%` }}
            />
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="text-slate-600">Add your portfolio URL. Recruiters click it first.</li>
            <li className="text-slate-600">Upload a resume so HR can share with hiring managers instantly.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2563EB]/10 text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm text-slate-900 break-words">{value}</div>
      </div>
    </div>
  );
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
