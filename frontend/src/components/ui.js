import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock3,
  Loader2,
  Search,
  X,
  XCircle,
} from "lucide-react";
import {
  APPLICATION_STATUS_VALUES,
  HIRING_WORKFLOW_STAGES,
  getApplicationStatusMeta,
  getHiringStageMeta,
  getReviewStatusMeta,
  REVIEW_STATUSES,
} from "../lib/workflow";

const STATUS_ICONS = {
  applied: CircleDot,
  screening: Clock3,
  interview: CircleDot,
  selected: CheckCircle2,
  offer_sent: Clock3,
  offer_signed: CheckCircle2,
  onboarding: Clock3,
  consultant_active: CheckCircle2,
  not_shortlisted: XCircle,
  resume_review: Clock3,
  technical_interview: CircleDot,
  client_interview: CircleDot,
  hr_contract_review: Clock3,
  converted_to_consultant: CheckCircle2,
  credentials_sent: CheckCircle2,
  pending_review: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
  needs_changes: AlertCircle,
};

export function StatusBadge({ value, type = "auto", withIcon = true, className = "" }) {
  const meta =
    type === "hiring" || HIRING_WORKFLOW_STAGES.includes(value)
      ? getHiringStageMeta(value)
      : type === "review" || REVIEW_STATUSES.includes(value)
      ? getReviewStatusMeta(value)
      : type === "application" || APPLICATION_STATUS_VALUES.includes(value)
      ? getApplicationStatusMeta(value)
      : {
          label: String(value || "New").replace(/_/g, " "),
          className: genericStatusClass(value),
        };
  const Icon = STATUS_ICONS[value] || CircleDot;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${meta.className} ${className}`}
      aria-label={`Status: ${meta.label}`}
    >
      {withIcon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {meta.label}
    </span>
  );
}

export function SectionHeader({ eyebrow, title, description, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563EB]">
            {eyebrow}
          </div>
        )}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ActionBar({ children, className = "" }) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center ${className}`}
    >
      {children}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search", label = "Search" }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
      />
    </label>
  );
}

export function EmptyState({ title = "Nothing here yet", body, action, to, onAction, Icon = CircleDot, className = "" }) {
  const actionClass =
    "mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]";

  return (
    <div className={`rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center ${className}`}>
      <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="mt-3 text-sm font-semibold text-slate-900">{title}</div>
      {body && <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">{body}</p>}
      {action && to && (
        <Link to={to} className={actionClass}>
          {action}
        </Link>
      )}
      {action && onAction && (
        <button type="button" onClick={onAction} className={actionClass}>
          {action}
        </button>
      )}
    </div>
  );
}

export function InlineError({ title = "Something went wrong", body, onRetry, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 ${className}`}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          {body && <div className="mt-1 leading-relaxed text-rose-800">{body}</div>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading", className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="confirm-title" className="font-heading text-xl font-semibold text-slate-900">
              {title}
            </h2>
            {body && (
              <p id="confirm-body" className="mt-2 text-sm leading-relaxed text-slate-600">
                {body}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close confirmation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60 ${
              destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-[#2563EB] hover:bg-[#1D4ED8]"
            }`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function genericStatusClass(value) {
  if (["published", "active"].includes(value)) return "bg-emerald-50 text-emerald-700";
  if (["paused", "pending_review"].includes(value)) return "bg-amber-50 text-amber-700";
  if (["closed", "rejected"].includes(value)) return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}
