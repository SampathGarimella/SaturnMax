import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Mail, Phone, Link2, FileUp, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, isFirebaseConfigured } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

const ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function MyProfile() {
  const { data, loading } = useOutletContext();
  const { user, mode } = useAuth();
  const [uploadProgress, setUploadProgress] = useState(null); // 0..100
  const [resumeUrl, setResumeUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (loading || !data)
    return <div className="text-sm text-slate-500">Loading profile…</div>;

  const canUpload = isFirebaseConfigured && mode === "firebase" && user?.uid;

  const { candidate, stats } = data;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset input so same file can be re-selected
    if (!file) return;

    if (!canUpload) {
      toast.info(
        "Resume upload needs Firebase Storage + signed-in auth. Configure Firebase in /app/frontend/.env and sign in to enable."
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is too large. Max 5MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const ext = file.name.split(".").pop() || "pdf";
    const fileRef = ref(storage, `resumes/${user.uid}/resume.${ext}`);
    const task = uploadBytesResumable(fileRef, file, { contentType: file.type });

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setUploadProgress(pct);
      },
      (err) => {
        console.error(err);
        setUploading(false);
        setUploadProgress(null);
        toast.error(
          err.code === "storage/unauthorized"
            ? "Upload blocked by Storage rules. Paste the rules from FIREBASE_SETUP.md."
            : "Upload failed. Try again."
        );
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          setResumeUrl(url);
          toast.success("Resume uploaded to Firebase Storage.");
        } catch (err) {
          console.error(err);
          toast.error("Uploaded but couldn't fetch download URL.");
        } finally {
          setUploading(false);
          // keep progress at 100% for a moment
          setTimeout(() => setUploadProgress(null), 800);
        }
      }
    );
  };

  return (
    <div className="space-y-6" data-testid="my-profile-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          My profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Keep your profile up to date — recruiters view this when considering you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
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
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow Icon={Mail} label="Email" value={candidate.email} />
            <InfoRow Icon={Phone} label="Phone" value={candidate.phone || "—"} />
            <InfoRow
              Icon={Link2}
              label="Portfolio"
              value={candidate.portfolio_url || "Add your LinkedIn / portfolio"}
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

          {/* Resume upload zone */}
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5" data-testid="resume-upload-zone">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileUp className="h-4 w-4 text-[#2563EB]" />
                  Upload resume
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  PDF, DOC, or DOCX · max 5MB · stored privately in Firebase Storage under{" "}
                  <code className="text-[11px]">resumes/{user?.uid || "{uid}"}</code>
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
                    Uploading…
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
                  <span>Uploading…</span>
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
                Upload is disabled in demo mode. Sign in with Firebase Auth to enable — see{" "}
                <code>FIREBASE_SETUP.md</code>.
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
            <li className="text-slate-600">Add your portfolio URL — recruiters click it first.</li>
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
