import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CircleDot,
  FileText,
  Landmark,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { fetchConsultantDashboard, submitBankReview } from "../lib/api";

const EMPTY_BANK = {
  account_holder: "",
  bank_name: "",
  account_number: "",
  ifsc: "",
};

export default function ConsultantDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ consultant: null, documents: [], reviews: [] });
  const [bank, setBank] = useState(EMPTY_BANK);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const next = await fetchConsultantDashboard(user.uid);
      setData(next);
      setBank((current) => ({
        ...current,
        account_holder: next.consultant?.name || "",
        bank_name: next.consultant?.bankDetails?.bank_name || "",
        ifsc: next.consultant?.bankDetails?.ifsc || "",
      }));
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Could not load consultant dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const consultant = useMemo(() => data.consultant || {}, [data.consultant]);
  const pendingReviews = data.reviews.filter((review) => review.status === "pending_review");

  const onboarding = useMemo(
    () => [
      { label: "Profile created", done: Boolean(consultant.uid) },
      {
        label: "Offer accepted",
        done:
          data.documents.some((doc) => doc.type === "signed_offer" && doc.status === "approved") ||
          data.reviews.some((review) => review.type === "signed_offer" && review.status === "approved"),
      },
      { label: "PAN / tax details", done: consultant.panStatus === "approved" },
      { label: "Bank payout setup", done: consultant.bankStatus === "approved" },
      { label: "Project assigned", done: Boolean(consultant.project && consultant.client) },
    ],
    [consultant, data.documents, data.reviews]
  );

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (!bank.account_holder || !bank.bank_name || !bank.account_number || !bank.ifsc) {
      toast.error("Complete bank holder, bank, account number, and IFSC.");
      return;
    }
    setBusy(true);
    try {
      await submitBankReview(bank);
      toast.success("Bank details sent for employee review.");
      setBank(EMPTY_BANK);
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not submit bank details.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <PortalHeader title="Consultant dashboard" onRefresh={load} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 space-y-6">
        {loading ? (
          <div className="text-sm text-slate-500">Loading consultant workspace...</div>
        ) : (
          <>
            <section className="rounded-2xl bg-[#0A192F] text-white p-7 md:p-9 overflow-hidden relative">
              <div className="absolute inset-y-0 right-0 w-1/2 bg-[#2563EB]/15" />
              <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold">
                    {consultant.consultantId || "Consultant profile"}
                  </div>
                  <h1 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-white">
                    {consultant.name || user?.name || "Consultant"}
                  </h1>
                  <p className="mt-3 text-white/70">
                    {consultant.role || "Consultant"} based in India
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Badge>{consultant.status || "Profile setup"}</Badge>
                    <Badge>Bank {consultant.bankStatus || "pending"}</Badge>
                    <Badge>PAN {consultant.panStatus || "pending"}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Metric Icon={Building2} label="Client" value={consultant.client || "Pending assignment"} />
                  <Metric Icon={BriefcaseBusiness} label="Project" value={consultant.project || "Pending assignment"} />
                  <Metric Icon={Banknote} label="Monthly pay" value={consultant.monthlyPay || "Pending"} />
                  <Metric Icon={CalendarDays} label="Start date" value={consultant.startDate || "Pending"} />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-5">
              <Panel title="Onboarding and India compliance" subtitle="Offer, tax, bank, UAN, and project readiness">
                <div className="space-y-3">
                  {onboarding.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
                      <span className="flex items-center gap-3 text-sm font-medium text-slate-800">
                        {item.done ? <Check className="h-4 w-4 text-emerald-600" /> : <CircleDot className="h-4 w-4 text-amber-500" />}
                        {item.label}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {item.done ? "Done" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Bank payout details" subtitle="Submit account details for employee/admin review">
                <form onSubmit={handleBankSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Account holder">
                    <input className={inputClass} value={bank.account_holder} onChange={(e) => setBank((f) => ({ ...f, account_holder: e.target.value }))} />
                  </Field>
                  <Field label="Bank name">
                    <input className={inputClass} value={bank.bank_name} onChange={(e) => setBank((f) => ({ ...f, bank_name: e.target.value }))} />
                  </Field>
                  <Field label="Account number">
                    <input className={inputClass} value={bank.account_number} onChange={(e) => setBank((f) => ({ ...f, account_number: e.target.value }))} />
                  </Field>
                  <Field label="IFSC">
                    <input className={inputClass} value={bank.ifsc} onChange={(e) => setBank((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))} />
                  </Field>
                  <div className="md:col-span-2 flex justify-end">
                    <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60 md:w-auto">
                      <Send className="h-4 w-4" />
                      Send for review
                    </button>
                  </div>
                </form>
                {pendingReviews.length > 0 && (
                  <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    {pendingReviews.length} item{pendingReviews.length === 1 ? "" : "s"} pending employee review.
                  </div>
                )}
              </Panel>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
              <Panel title="Documents" subtitle="Offer, onboarding, compliance, and payroll files">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <div className="min-w-[680px]">
                    <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                      <div>Name</div>
                      <div>Type</div>
                      <div>Status</div>
                      <div>File</div>
                    </div>
                    {data.documents.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">No documents assigned yet.</div>
                    )}
                    {data.documents.map((doc) => (
                      <div key={doc.id} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] px-4 py-3 text-sm border-t border-slate-100 bg-white">
                        <div className="font-medium text-slate-900">{doc.title || doc.file_name}</div>
                        <div className="capitalize text-slate-600">{String(doc.type || "").replace(/_/g, " ")}</div>
                        <div className="capitalize text-slate-600">{String(doc.status || "uploaded").replace(/_/g, " ")}</div>
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
                          Open
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Pay and tax snapshot" subtitle="Employee-created details for consultant visibility">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MiniCard Icon={Landmark} label="Bank" value={consultant.bankStatus || "Pending"} />
                  <MiniCard Icon={ShieldCheck} label="PAN" value={consultant.panStatus || "Pending"} />
                  <MiniCard Icon={FileText} label="UAN / EPF" value={consultant.uanStatus || "Pending"} />
                  <MiniCard Icon={Banknote} label="Monthly pay" value={consultant.monthlyPay || "Pending"} />
                </div>
                <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  Salary slips, Form 16, and payroll files will appear here after the finance team uploads them.
                </div>
              </Panel>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function PortalHeader({ title, onRefresh }) {
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 min-h-16 py-2 flex items-center justify-between gap-3">
        <Logo to="/consultant-dashboard" />
        <div className="flex items-center gap-3">
          <button onClick={onRefresh} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <span className="hidden sm:inline text-sm font-medium text-slate-600">{title}</span>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#2563EB] font-medium">
            <ArrowLeft className="h-4 w-4" />
            Website
          </Link>
        </div>
      </div>
    </header>
  );
}

const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
      <div className="mb-5">
        <h2 className="font-heading text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Metric({ Icon, label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <Icon className="h-4 w-4 text-white/60" />
      <div className="mt-3 text-xs uppercase tracking-[0.16em] text-white/45 font-semibold">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white leading-snug">{value}</div>
    </div>
  );
}

function MiniCard({ Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <Icon className="h-4 w-4 text-[#2563EB]" />
      <div className="mt-3 text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
      {children}
    </span>
  );
}
