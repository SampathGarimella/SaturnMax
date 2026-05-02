import React, { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { FileText, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadSignedCandidateDocument } from "../lib/api";

const STATUS_META = {
  applied: { label: "Applied", className: "bg-slate-100 text-slate-700" },
  screening: { label: "Screening", className: "bg-amber-100 text-amber-800" },
  under_review: { label: "Under review", className: "bg-amber-100 text-amber-800" },
  interview: { label: "Interview", className: "bg-emerald-100 text-emerald-800" },
  pending: { label: "Pending", className: "bg-slate-100 text-slate-700" },
  not_shortlisted: { label: "Not shortlisted", className: "bg-rose-100 text-rose-800" },
  offer: { label: "Offer", className: "bg-blue-100 text-blue-800" },
  selected: { label: "Selected", className: "bg-blue-100 text-blue-800" },
  offer_sent: { label: "Offer sent", className: "bg-blue-100 text-blue-800" },
  offer_signed: { label: "Offer signed", className: "bg-emerald-100 text-emerald-800" },
  onboarding: { label: "Onboarding", className: "bg-violet-100 text-violet-800" },
  consultant_active: { label: "Consultant active", className: "bg-emerald-100 text-emerald-800" },
};

export default function MyApplications() {
  const { data, loading, reload } = useOutletContext();
  const [uploadingFor, setUploadingFor] = useState("");

  if (loading || !data) return <div className="text-sm text-slate-500">Loading…</div>;

  const documentsByApplication = (data.documents || []).reduce((acc, doc) => {
    if (!doc.application_id) return acc;
    acc[doc.application_id] = acc[doc.application_id] || [];
    acc[doc.application_id].push(doc);
    return acc;
  }, {});

  const handleSignedUpload = async (application, file, type) => {
    if (!file) return;
    setUploadingFor(`${application.id}-${type}`);
    try {
      await uploadSignedCandidateDocument(application, file, type);
      toast.success("Document uploaded for employee review.");
      reload?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Upload failed.");
    } finally {
      setUploadingFor("");
    }
  };

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

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[1.35fr_0.8fr_0.8fr_0.9fr_1.1fr] px-6 py-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">
            <div>Position</div>
            <div>Applied</div>
            <div>Experience</div>
            <div>Status</div>
            <div>Documents</div>
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
          const docs = documentsByApplication[a.id] || [];
          const offer = docs.find((doc) => doc.type === "offer_letter");
          const onboardingDocs = docs.filter((doc) => doc.type !== "offer_letter" && doc.type !== "signed_offer");
          return (
            <div
              key={a.id}
              className="grid grid-cols-[1.35fr_0.8fr_0.8fr_0.9fr_1.1fr] gap-3 px-6 py-4 items-start text-sm border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
              data-testid={`app-row-${a.id}`}
            >
              <div className="font-semibold text-slate-900">{a.position_title}</div>
              <div className="text-slate-600">{a.applied_ago || "recently"}</div>
              <div className="text-slate-600">{a.years_experience} yrs</div>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}
                >
                  {meta.label}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {offer ? (
                  <a
                    href={offer.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Offer letter
                  </a>
                ) : (
                  <div className="text-slate-400">No offer documents yet</div>
                )}
                {offer && (
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50">
                    <UploadCloud className="h-3.5 w-3.5" />
                    {uploadingFor === `${a.id}-signed_offer` ? "Uploading..." : "Upload signed offer"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleSignedUpload(a, e.target.files?.[0], "signed_offer")}
                    />
                  </label>
                )}
                {onboardingDocs.length > 0 && (
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50">
                    <UploadCloud className="h-3.5 w-3.5" />
                    {uploadingFor === `${a.id}-signed_onboarding` ? "Uploading..." : "Upload onboarding doc"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleSignedUpload(a, e.target.files?.[0], "signed_onboarding")}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
