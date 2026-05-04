import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CircleDot,
  FileText,
  Landmark,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import Logo from "../components/Logo";
import LoginMenu from "../components/LoginMenu";
import DashboardThemeToggle from "../components/DashboardThemeToggle";
import { useAuth } from "../context/AuthContext";
import {
  fetchConsultantDashboard,
  sendConsultantSupportRequest,
  submitBankReview,
  updateOwnUserProfile,
} from "../lib/api";
import { EmptyState, SectionHeader, StatusBadge } from "../components/ui";

const EMPTY_BANK = {
  account_holder: "",
  bank_name: "",
  account_number: "",
  ifsc: "",
};

export default function ConsultantDashboard({ profileOnly = false }) {
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
        account_holder: cleanDisplayName(next.consultant?.name, next.consultant?.email) || "",
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
  const priorityTasks = useMemo(
    () => [
      {
        label: "Complete bank payout review",
        done: consultant.bankStatus === "approved",
        action: consultant.bankStatus === "approved" ? "Approved" : "Submit or wait for review",
      },
      {
        label: "Confirm signed offer approval",
        done: onboarding.find((item) => item.label === "Offer accepted")?.done,
        action: "Review documents section",
      },
      {
        label: "Project assignment",
        done: Boolean(consultant.project && consultant.client),
        action: consultant.project && consultant.client ? "Assigned" : "Waiting for employee team",
      },
    ],
    [consultant, onboarding]
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
    <div className="dashboard-surface min-h-screen bg-[#F8FAFC] text-slate-900">
      <PortalHeader onRefresh={load} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 space-y-6">
        {loading ? (
          <div className="text-sm text-slate-500">Loading consultant workspace...</div>
        ) : profileOnly ? (
          <ConsultantProfileEditor consultant={consultant} user={user} reload={load} />
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
              <SectionHeader
                eyebrow="Consultant priorities"
                title="Finish the items that unblock payroll and project readiness"
                description="These tasks update from documents, reviews, and employee-created consultant details."
              />
              <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_0.85fr]">
                <div className="space-y-3">
                  {priorityTasks.map((task) => (
                    <div key={task.label} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{task.label}</div>
                        <div className="mt-1 text-xs text-slate-500">{task.action}</div>
                      </div>
                      <StatusBadge value={task.done ? "approved" : "pending_review"} type="review" />
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Pending approvals</div>
                  <div className="mt-3 space-y-2">
                    {pendingReviews.length === 0 && (
                      <EmptyState title="No pending approvals" body="New document or bank reviews will appear here." />
                    )}
                    {pendingReviews.map((review) => (
                      <div key={review.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <div className="font-semibold text-slate-900">{review.title || review.type}</div>
                        <div className="mt-1 text-xs text-slate-500">{review.details || "Waiting for employee review"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-[#0A192F] text-white p-7 md:p-9 overflow-hidden relative">
              <div className="absolute inset-y-0 right-0 w-1/2 bg-[#2563EB]/15" />
              <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold">
                    {consultant.consultantId || "Consultant profile"}
                  </div>
                  <h1 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-white">
                    {cleanDisplayName(consultant.name, consultant.email) || user?.name || "Consultant"}
                  </h1>
                  <p className="mt-3 text-white/70">
                    {consultant.role || "Consultant"}
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
              <Panel title="Onboarding and compliance" subtitle="Offer, tax, bank, UAN, and project readiness">
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
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Bank details are submitted for employee/admin review and cannot be used for payout until approved.
                  {consultant.bankStatus === "approved" ? " Approved bank details require a new update request before changes are used." : ""}
                </div>
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
                      {consultant.bankStatus === "approved" ? "Request bank update" : "Send for review"}
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
                <div className="space-y-3">
                  {data.documents.length === 0 && (
                    <EmptyState title="No documents assigned yet" body="Offer, onboarding, compliance, and payroll documents will appear here." />
                  )}
                  {data.documents.map((doc) => (
                    <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{doc.title || doc.file_name}</div>
                          <div className="mt-1 capitalize text-slate-500">{String(doc.type || "").replace(/_/g, " ")}</div>
                        </div>
                        <StatusBadge value={doc.status || "uploaded"} type="review" />
                      </div>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
                          Open document
                        </a>
                      )}
                    </div>
                  ))}
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
                  This is an information snapshot, not payroll processing. Salary slips, Form 16, and payroll files will appear here after the finance team uploads them.
                </div>
              </Panel>
            </section>

            <ConsultantSupportPanel reload={load} />
          </>
        )}
      </main>
    </div>
  );
}

function PortalHeader({ onRefresh }) {
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 min-h-16 py-2 flex items-center justify-between gap-3">
        <Logo to="/consultant-dashboard" />
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <LoginMenu />
          <DashboardThemeToggle />
        </div>
      </div>
    </header>
  );
}

function cleanDisplayName(name, email) {
  const value = String(name || "").trim();
  const local = String(email || "").split("@")[0].trim();
  if (!value) return "";
  if (value.toLowerCase() === local.toLowerCase()) return "";
  if (value.toLowerCase().includes("consultant.test")) return "";
  return value;
}

function ConsultantProfileEditor({ consultant, user, reload }) {
  const [form, setForm] = useState({
    name: cleanDisplayName(consultant.name, consultant.email) || user?.name || "",
    email: consultant.email || user?.email || "",
    phone: consultant.phone || "",
    location: consultant.location || "",
    bio: consultant.bio || consultant.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateOwnUserProfile({ ...form, role: "consultant" });
      toast.success("Consultant profile updated.");
      reload?.();
    } catch (err) {
      toast.error(err?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7">
      <SectionHeader
        eyebrow="Consultant profile"
        title="Edit consultant profile"
        description="Keep your contact and work details current for employee/admin review."
      />
      <form onSubmit={save} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Full name"><input className={inputClass} value={form.name} onChange={(e) => update("name", e.target.value)} /></Field>
        <Field label="Email"><input className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
        <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
        <Field label="Location"><input className={inputClass} value={form.location} onChange={(e) => update("location", e.target.value)} /></Field>
        <Field label="Notes" className="md:col-span-2"><textarea className={`${inputClass} h-28 resize-none py-3`} value={form.bio} onChange={(e) => update("bio", e.target.value)} /></Field>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:col-span-2">
          Client, project, pay, start date, consultant status, bank approval, PAN approval, UAN approval, and compliance status are managed by employee/admin teams.
        </div>
        <div className="flex justify-end md:col-span-2">
          <button disabled={saving} className="inline-flex h-11 items-center justify-center rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ConsultantSupportPanel({ reload }) {
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await sendConsultantSupportRequest({ category, message });
      toast.success("Support request sent to operations.");
      setMessage("");
      reload?.();
    } catch (err) {
      toast.error(err?.message || "Could not send support request.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel title="Support" subtitle="Contact HR or operations about bank, documents, payroll, project, or account questions">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-[0.35fr_1fr_auto] md:items-end">
        <Field label="Category">
          <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="general">General support</option>
            <option value="bank">Bank</option>
            <option value="documents">Documents</option>
            <option value="payroll">Payroll</option>
            <option value="project">Project</option>
            <option value="account">Account</option>
          </select>
        </Field>
        <Field label="Message">
          <input className={inputClass} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell the team what you need help with" />
        </Field>
        <button disabled={sending} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
          <MessageSquare className="h-4 w-4" />
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </Panel>
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
