import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, FileText, X } from "lucide-react";
import {
  ActionBar,
  EmptyState,
  SearchInput,
  SectionHeader,
  StatusBadge,
} from "../../components/ui";
import { resolveReview } from "../../lib/api";
import { getReviewStatusMeta, REVIEW_STATUSES } from "../../lib/workflow";
import ActivityFeed from "./ActivityFeed";
import { useOperations } from "./OperationsContext";
import { sortRecent, textIncludes } from "./operationsUtils";

const PRESETS = [
  { id: "pending_review", label: "Pending review" },
  { id: "needs_changes", label: "Needs changes" },
  { id: "documents", label: "Documents" },
  { id: "compliance", label: "Compliance" },
  { id: "all", label: "All reviews" },
];

const DOCUMENT_TYPES = ["signed_offer", "signed_onboarding", "onboarding_pack", "form12bb"];
const COMPLIANCE_TYPES = ["bank_details", "pan", "uan"];

export default function OperationsReviews() {
  const { data, busy, setBusy, load, showMutationError } = useOperations();
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState("pending_review");
  const [status, setStatus] = useState("all");

  const reviews = useMemo(() => {
    return sortRecent(data.reviews)
      .filter((review) => status === "all" || review.status === status)
      .filter((review) => {
        if (preset === "documents") return DOCUMENT_TYPES.includes(review.type);
        if (preset === "compliance") return COMPLIANCE_TYPES.includes(review.type);
        if (preset === "all") return true;
        return review.status === preset;
      })
      .filter((review) => textIncludes(review, query, ["title", "details", "owner_uid", "type", "status"]));
  }, [data.reviews, preset, query, status]);

  const handleReview = async (review, nextStatus) => {
    setBusy(`${review.id}-${nextStatus}`);
    try {
      await resolveReview(review, nextStatus);
      toast.success(
        nextStatus === "approved"
          ? "Review approved."
          : nextStatus === "needs_changes"
          ? "Review marked as needs changes."
          : "Review rejected."
      );
      await load();
    } catch (err) {
      showMutationError(err, "Could not update review.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5" data-testid="operations-reviews-page">
      <SectionHeader
        eyebrow="Reviews"
        title="Review queue and activity"
        description="Approve signed documents, onboarding packets, Form 12BB, bank details, PAN, UAN, and other compliance updates."
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-4">
          <ActionBar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search reviews by owner, title, details, or type" />
            <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter reviews by status">
              <option value="all">All statuses</option>
              {REVIEW_STATUSES.map((value) => (
                <option key={value} value={value}>{getReviewStatusMeta(value).label}</option>
              ))}
            </select>
          </ActionBar>

          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Review saved views">
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

          <div className="space-y-3">
            {reviews.length === 0 && (
              <EmptyState title="No reviews match this queue" body="Try another saved view or search term." Icon={FileText} />
            )}
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg font-semibold text-slate-900">{review.title || review.type}</h2>
                    <div className="mt-1 text-xs text-slate-500">{review.owner_uid || review.consultant_uid || "owner not set"} / {review.type}</div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{review.details || "No review details provided."}</p>
                  </div>
                  <StatusBadge value={review.status} type="review" />
                </div>
                {review.status === "pending_review" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => handleReview(review, "approved")} disabled={busy === `${review.id}-approved`} className="inline-flex h-9 items-center gap-1 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Approve
                    </button>
                    <button onClick={() => handleReview(review, "needs_changes")} disabled={busy === `${review.id}-needs_changes`} className="inline-flex h-9 items-center gap-1 rounded-md bg-amber-500 px-3 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
                      Needs changes
                    </button>
                    <button onClick={() => handleReview(review, "rejected")} disabled={busy === `${review.id}-rejected`} className="inline-flex h-9 items-center gap-1 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <ActivityFeed logs={data.activityLogs} />
      </section>
    </div>
  );
}

const selectClass =
  "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]";
