import React, { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import {
  ActionBar,
  EmptyState,
  SearchInput,
  SectionHeader,
  StatusBadge,
} from "../../components/ui";
import { HIRING_WORKFLOW_STAGES, getHiringStageMeta } from "../../lib/workflow";
import { useOperations } from "./OperationsContext";
import { humanDate, sortRecent, textIncludes } from "./operationsUtils";

export default function OperationsInterviewReviews() {
  const { data } = useOperations();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [recommendation, setRecommendation] = useState("all");

  const candidateByUid = useMemo(() => {
    return [...data.candidates, ...data.users].reduce((acc, item) => {
      const uid = item.uid || item.id;
      if (uid) acc[uid] = { ...(acc[uid] || {}), ...item };
      return acc;
    }, {});
  }, [data.candidates, data.users]);

  const reviews = useMemo(() => {
    return sortRecent(data.reviews.filter((review) => review.type === "interview_review"))
      .filter((review) => stage === "all" || review.stage === stage)
      .filter((review) => recommendation === "all" || review.recommendation === recommendation)
      .filter((review) => {
        const candidate = candidateByUid[review.candidate_uid] || {};
        return textIncludes(
          { ...review, candidateName: candidate.name, candidateEmail: candidate.email },
          query,
          ["candidateName", "candidateEmail", "candidate_uid", "notes", "recommendation"]
        );
      });
  }, [candidateByUid, data.reviews, query, recommendation, stage]);

  return (
    <div className="space-y-5" data-testid="operations-interview-reviews-page">
      <SectionHeader
        eyebrow="Hiring Workflow"
        title="Interview Reviews"
        description="Review recruiter, technical, client, and HR feedback captured during the hiring workflow."
      />

      <ActionBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search candidate, notes, or recommendation" />
        <select className={selectClass} value={stage} onChange={(event) => setStage(event.target.value)} aria-label="Filter by interview stage">
          <option value="all">All stages</option>
          {HIRING_WORKFLOW_STAGES.map((value) => (
            <option key={value} value={value}>{getHiringStageMeta(value).label}</option>
          ))}
        </select>
        <select className={selectClass} value={recommendation} onChange={(event) => setRecommendation(event.target.value)} aria-label="Filter by recommendation">
          <option value="all">All recommendations</option>
          <option value="continue">Continue</option>
          <option value="hold">Hold</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>
      </ActionBar>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {reviews.length === 0 && (
          <EmptyState title="No interview reviews match this view" body="Add reviews from the candidate detail page after each interview stage." Icon={FileText} className="lg:col-span-2" />
        )}
        {reviews.map((review) => {
          const candidate = candidateByUid[review.candidate_uid] || {};
          return (
            <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-semibold text-slate-900">
                    {candidate.name || review.candidate_uid || "Candidate"}
                  </h2>
                  <div className="mt-1 text-xs text-slate-500">{candidate.email || review.application_id || "Application review"}</div>
                </div>
                <StatusBadge value={review.stage || "screening"} type="hiring" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge value={`rating ${review.rating || "-"}`} withIcon={false} />
                <StatusBadge value={review.recommendation || "continue"} withIcon={false} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{review.notes || "No notes provided."}</p>
              <div className="mt-3 text-[11px] text-slate-400">
                {review.createdBy || "Employee"} / {humanDate(review.createdAt || review.created_at)}
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
