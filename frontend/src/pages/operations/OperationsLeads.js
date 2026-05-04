import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";
import {
  ActionBar,
  EmptyState,
  SearchInput,
  SectionHeader,
  StatusBadge,
} from "../../components/ui";
import { updateLeadStatus } from "../../lib/api";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "../../lib/constants";
import { useOperations } from "./OperationsContext";
import { humanDate, sortRecent, textIncludes } from "./operationsUtils";

export default function OperationsLeads() {
  const { data, busy, setBusy, load, showMutationError } = useOperations();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState({});

  const leads = useMemo(
    () =>
      sortRecent(data.leads || [], "updatedAt")
        .filter((lead) => status === "all" || (lead.leadStatus || lead.status || "new") === status)
        .filter((lead) =>
          textIncludes(lead, query, ["name", "email", "company", "subject", "message", "assignedEmployeeId"])
        ),
    [data.leads, query, status]
  );

  const updateDraft = (lead, key, value) => {
    const id = lead.id;
    setEditing((current) => ({
      ...current,
      [id]: {
        status: lead.leadStatus || lead.status || "new",
        assignedEmployeeId: lead.assignedEmployeeId || "",
        notes: lead.notes || "",
        ...(current[id] || {}),
        [key]: value,
      },
    }));
  };

  const saveLead = async (lead) => {
    const id = lead.id;
    const draft = editing[id] || {
      status: lead.leadStatus || lead.status || "new",
      assignedEmployeeId: lead.assignedEmployeeId || "",
      notes: lead.notes || "",
    };
    setBusy(`${id}-lead`);
    try {
      await updateLeadStatus(id, draft);
      toast.success("Lead updated.");
      setEditing((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      showMutationError(err, "Could not update lead.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5" data-testid="operations-leads-page">
      <SectionHeader
        eyebrow="Operations"
        title="Lead management"
        description="Track website enquiries from first contact through qualification and conversion."
      />

      <ActionBar className="flex-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, company, subject, or notes" />
        <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All lead statuses</option>
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value}>{LEAD_STATUS_LABELS[value]}</option>
          ))}
        </select>
      </ActionBar>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {leads.length === 0 && (
          <EmptyState
            title="No leads match this view"
            body="New public contact form submissions will appear here."
            Icon={Building2}
            className="lg:col-span-2"
          />
        )}
        {leads.map((lead) => {
          const draft = editing[lead.id] || {
            status: lead.leadStatus || lead.status || "new",
            assignedEmployeeId: lead.assignedEmployeeId || "",
            notes: lead.notes || "",
          };
          return (
            <article key={lead.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg font-semibold text-slate-900">{lead.name || "Website lead"}</h2>
                  <div className="mt-1 text-xs text-slate-500">{lead.email || "email missing"} / {lead.company || "company not set"}</div>
                  <div className="mt-1 text-xs text-slate-400">Received {humanDate(lead.createdAt || lead.created_at)}</div>
                </div>
                <StatusBadge value={draft.status} />
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{lead.subject || "General enquiry"}</div>
                <p className="mt-2 whitespace-pre-wrap">{lead.message || "No message provided."}</p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <span>Budget: {lead.budget_range || "Not set"}</span>
                  <span>Timeline: {lead.timeline || "Not set"}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">Lead status</span>
                  <select className={inputClass} value={draft.status} onChange={(event) => updateDraft(lead, "status", event.target.value)}>
                    {LEAD_STATUSES.map((value) => (
                      <option key={value} value={value}>{LEAD_STATUS_LABELS[value]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">Assigned employee</span>
                  <input className={inputClass} value={draft.assignedEmployeeId} onChange={(event) => updateDraft(lead, "assignedEmployeeId", event.target.value)} placeholder="Employee UID or name" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">Follow-up notes</span>
                  <textarea className={`${inputClass} h-24 resize-none py-3`} value={draft.notes} onChange={(event) => updateDraft(lead, "notes", event.target.value)} />
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => saveLead(lead)}
                  disabled={busy === `${lead.id}-lead`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {busy === `${lead.id}-lead` ? "Saving..." : "Save lead"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]";

const selectClass =
  "h-10 min-w-[12rem] rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]";
