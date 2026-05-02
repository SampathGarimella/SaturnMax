import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { BriefcaseBusiness, Send, Users } from "lucide-react";
import {
  ActionBar,
  EmptyState,
  SearchInput,
  SectionHeader,
  StatusBadge,
} from "../../components/ui";
import { updateConsultantProfile } from "../../lib/api";
import { useOperations } from "./OperationsContext";
import { compactName, sortRecent } from "./operationsUtils";

const EMPTY_CONSULTANT = {
  uid: "",
  client: "",
  project: "",
  monthlyPay: "",
  startDate: "",
};

export default function OperationsConsultants() {
  const { data, busy, setBusy, load, showMutationError } = useOperations();
  const [consultantForm, setConsultantForm] = useState(EMPTY_CONSULTANT);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const consultants = useMemo(() => {
    return sortRecent(data.consultants)
      .filter((consultant) => status === "all" || consultant.bankStatus === status || consultant.panStatus === status || consultant.uanStatus === status)
      .filter((consultant) =>
        [consultant.name, consultant.email, consultant.client, consultant.project, consultant.consultantId]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      );
  }, [data.consultants, query, status]);

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

  const handleConsultantUpdate = async (event) => {
    event.preventDefault();
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
      showMutationError(err, "Could not update consultant.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5" data-testid="operations-consultants-page">
      <SectionHeader
        eyebrow="Consultants"
        title="Assignments and payroll readiness"
        description="Manage active consultant project assignment, client details, pay summary, and India compliance review states."
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <form onSubmit={handleConsultantUpdate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <div className="flex items-end justify-end md:col-span-2">
            <button disabled={busy === "consultant"} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60 md:w-auto">
              <Send className="h-4 w-4" aria-hidden="true" />
              Update consultant
            </button>
          </div>
        </form>
      </section>

      <ActionBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search consultants, client, project, or ID" />
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter consultants by compliance status">
          <option value="all">All compliance states</option>
          <option value="pending_review">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="needs_changes">Needs changes</option>
        </select>
      </ActionBar>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {consultants.length === 0 && (
          <EmptyState title="No consultants match this view" body="Activated candidates will appear here after consultant conversion." Icon={Users} className="lg:col-span-2" />
        )}
        {consultants.map((consultant) => (
          <article key={consultant.uid || consultant.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-slate-900">{compactName(consultant.name, "Consultant")}</h2>
                <div className="mt-1 text-xs text-slate-500">{consultant.consultantId || consultant.email}</div>
              </div>
              <StatusBadge value={consultant.status || "active"} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Mini label="Client" value={consultant.client || "Pending assignment"} />
              <Mini label="Project" value={consultant.project || "Pending assignment"} />
              <Mini label="Monthly pay" value={consultant.monthlyPay || "Pending"} />
              <Mini label="Start date" value={consultant.startDate || "Pending"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge value={consultant.bankStatus || "pending_review"} type="review" />
              <StatusBadge value={consultant.panStatus || "pending_review"} type="review" />
              <StatusBadge value={consultant.uanStatus || "pending_review"} type="review" />
              <button onClick={() => chooseConsultant(consultant.uid || consultant.id)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Edit assignment
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <BriefcaseBusiness className="h-3 w-3" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}
