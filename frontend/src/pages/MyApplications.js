import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { FileText, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { uploadSignedCandidateDocument } from "../lib/api";
import { getApplicationStatusMeta, isWorkflowTransitionError } from "../lib/workflow";
import { EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { PUBLIC_APPLICATION_STATUS_LABELS } from "../lib/constants";

export default function MyApplications() {
  const { data, loading, reload } = useOutletContext();
  const [uploadingFor, setUploadingFor] = useState("");

  if (loading || !data) return <div className="text-sm text-slate-500">Loading...</div>;

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
      if (isWorkflowTransitionError(err)) {
        toast.error(err.message, { description: err.details?.nextAction });
      } else {
        toast.error(err?.message || "Upload failed.");
      }
    } finally {
      setUploadingFor("");
    }
  };

  const uploadTypeForRequest = (docType) => {
    if (["onboarding", "onboarding_pack", "signed_onboarding_document"].includes(docType)) {
      return "signed_onboarding";
    }
    return docType || "signed_onboarding";
  };

  const documentLabel = (type) => String(type || "document").replace(/_/g, " ");

  return (
    <div className="space-y-5" data-testid="my-applications-page">
      <SectionHeader
        title="My applications"
        description="Track each role, see what the current status means, and complete document requests from the hiring team."
      />

        {data.applications.length === 0 && (
          <EmptyState
            title="No applications yet"
            body="Browse open jobs and apply with your candidate profile."
            action="Browse open jobs"
            to="/dashboard/jobs"
          />
        )}
      <div className="grid grid-cols-1 gap-4">
        {data.applications.map((a) => {
          const meta = getApplicationStatusMeta(a.status);
          const docs = documentsByApplication[a.id] || [];
          const offer = docs.find((doc) => doc.type === "offer_letter");
          const onboardingDocs = docs.filter((doc) => doc.type !== "offer_letter" && doc.type !== "signed_offer");
          const actionableDocs = onboardingDocs.filter((doc) =>
            ["requested", "sent", "uploaded"].includes(doc.status || "uploaded")
          );
          return (
            <article
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
              data-testid={`app-row-${a.id}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-semibold text-slate-900">{a.position_title}</h2>
                  <div className="mt-1 text-sm text-slate-500">
                    Applied {a.applied_ago || "recently"} / {a.years_experience || "0"} yrs
                  </div>
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                    {meta.nextAction}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <StatusBadge value={a.status} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    Candidate status: {PUBLIC_APPLICATION_STATUS_LABELS[a.status] || meta.label}
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="font-semibold text-slate-900">Interview schedule</div>
                {a.interview_date || a.interviewTime || a.meeting_link ? (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <span>Date/time: {a.interview_date || a.interviewTime || "To be confirmed"}</span>
                    <span>Interviewer: {a.interviewer || "Hiring team"}</span>
                    {a.meeting_link && (
                      <a href={a.meeting_link} target="_blank" rel="noreferrer" className="font-semibold text-[#2563EB]">
                        Open meeting link
                      </a>
                    )}
                    <span>Status: {a.interviewStatus || "Not scheduled"}</span>
                  </div>
                ) : (
                  <div className="mt-1">No interview scheduled yet. The hiring team will share details here when ready.</div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
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
                {onboardingDocs.map((doc) => (
                  <div key={doc.id} className="flex flex-col gap-1">
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {documentLabel(doc.type)}
                      </a>
                    )}
                    {["pending_review", "approved", "rejected", "needs_changes"].includes(doc.status) && (
                      <span className="text-slate-500">
                        {documentLabel(doc.type)}: {String(doc.status).replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                ))}
                {actionableDocs.map((doc) => {
                  const uploadType = uploadTypeForRequest(doc.type);
                  return (
                    <label
                      key={`${doc.id}-upload`}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      {uploadingFor === `${a.id}-${uploadType}`
                        ? "Uploading..."
                        : `Upload ${documentLabel(doc.type)}`}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => handleSignedUpload(a, e.target.files?.[0], uploadType)}
                      />
                    </label>
                  );
                })}
                {onboardingDocs.length === 0 && offer && (
                  <div className="text-slate-400">No onboarding documents yet</div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
