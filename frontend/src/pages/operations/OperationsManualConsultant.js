import React, { useState } from "react";
import { toast } from "sonner";
import { BriefcaseBusiness, Clipboard, Send } from "lucide-react";
import { InlineError, SectionHeader } from "../../components/ui";
import { manuallyAddConsultant } from "../../lib/api";
import { useOperations } from "./OperationsContext";

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  skills: "",
  roleTitle: "",
  consultantType: "Contract",
  clientName: "",
  startDate: "",
  workLocation: "India",
  rate: "",
  loginEnabled: true,
  prepareEmail: true,
  sendInvitationEmail: true,
  notes: "",
};

const CONSULTANT_TYPES = ["Contract", "Full-time", "Bench", "Client-assigned"];

export default function OperationsManualConsultant() {
  const { busy, setBusy, load, showMutationError } = useOperations();
  const [form, setForm] = useState(EMPTY_FORM);
  const [inlineError, setInlineError] = useState(null);
  const [result, setResult] = useState(null);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setInlineError(null);
    setResult(null);
    setBusy("manual-consultant");
    try {
      const created = await manuallyAddConsultant(form);
      setResult(created);
      toast.success(
        created.emailSent
          ? "Consultant created and invitation email sent."
          : "Consultant profile created."
      );
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Could not create consultant."));
    } finally {
      setBusy("");
    }
  };

  const copyInvite = async () => {
    if (!result?.invite) return;
    try {
      await navigator.clipboard?.writeText(`Subject: ${result.invite.subject}\n\n${result.invite.body}`);
      toast.success("Invitation message copied.");
    } catch {
      toast.error("Copy failed. Select the message text manually.");
    }
  };

  return (
    <div className="space-y-5" data-testid="operations-manual-consultant-page">
      <SectionHeader
        eyebrow="Hiring Workflow"
        title="Manual Add Consultant"
        description="Create a consultant profile directly and send a Firebase password setup email when the consultant invite function is deployed."
      />

      {inlineError && <InlineError title={inlineError.title} body={inlineError.body} onRetry={() => setInlineError(null)} />}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.8fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full name"><input className={inputClass} value={form.fullName} onChange={(event) => update("fullName", event.target.value)} /></Field>
            <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
            <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
            <Field label="Role title"><input className={inputClass} value={form.roleTitle} onChange={(event) => update("roleTitle", event.target.value)} /></Field>
            <Field label="Consultant type">
              <select className={inputClass} value={form.consultantType} onChange={(event) => update("consultantType", event.target.value)}>
                {CONSULTANT_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </Field>
            <Field label="Client name"><input className={inputClass} value={form.clientName} onChange={(event) => update("clientName", event.target.value)} /></Field>
            <Field label="Start date"><input type="date" className={inputClass} value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field>
            <Field label="Work location"><input className={inputClass} value={form.workLocation} onChange={(event) => update("workLocation", event.target.value)} /></Field>
            <Field label="Rate / salary"><input className={inputClass} value={form.rate} onChange={(event) => update("rate", event.target.value)} placeholder="INR 1,80,000" /></Field>
            <Field label="Skills" className="md:col-span-2"><input className={inputClass} value={form.skills} onChange={(event) => update("skills", event.target.value)} placeholder="React, Python, AWS" /></Field>
            <Field label="Notes" className="md:col-span-2"><textarea className={`${inputClass} h-24 py-3`} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="mt-1" checked={form.loginEnabled} onChange={(event) => update("loginEnabled", event.target.checked)} />
              Enable login when matching Firebase user exists
            </label>
            <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" className="mt-1" checked={form.prepareEmail} onChange={(event) => update("prepareEmail", event.target.checked)} />
              Prepare invitation email text
            </label>
            <label className="flex items-start gap-3 text-sm font-semibold text-slate-700 sm:col-span-2">
              <input type="checkbox" className="mt-1" checked={form.sendInvitationEmail} onChange={(event) => update("sendInvitationEmail", event.target.checked)} />
              Send invitation email to create password and sign in
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button disabled={busy === "manual-consultant"} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60 sm:w-auto">
              <Send className="h-4 w-4" aria-hidden="true" />
              {busy === "manual-consultant" ? "Creating..." : "Create consultant"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-[#2563EB]" />
              <h2 className="font-heading text-lg font-semibold text-slate-900">Login setup behavior</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              When Firebase Functions are deployed, the app securely creates or links the Firebase Auth user, assigns consultant role, and sends a Firebase password setup email. If Functions are not deployed, the app falls back to Firestore-only profile creation and shows setup guidance.
            </p>
          </div>
          {result && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="font-heading text-lg font-semibold text-emerald-950">
                {result.emailSent ? "Invitation email sent" : "Consultant created"}
              </h2>
              {result.emailSent && (
                <p className="mt-2 text-sm leading-relaxed text-emerald-900">
                  The consultant can open the email, create a password, and sign in at the Consultant Portal.
                </p>
              )}
              {result.functionFallback && (
                <p className="mt-2 text-sm leading-relaxed text-amber-900">
                  Automatic invite email needs the Firebase Function deployment. This profile was saved, but no Auth invitation email was sent.
                </p>
              )}
              {result.loginSetupRequired && (
                <p className="mt-2 text-sm leading-relaxed text-emerald-900">
                  Login is not enabled yet. Create this user in Firebase Authentication, then add/update{" "}
                  <code className="rounded bg-white px-1 py-0.5">users/{"{uid}"}</code> with role{" "}
                  <code className="rounded bg-white px-1 py-0.5">consultant</code>.
                </p>
              )}
              {result.invite && (
                <>
                  <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">{`Subject: ${result.invite.subject}\n\n${result.invite.body}`}</pre>
                  <button type="button" onClick={copyInvite} className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">
                    <Clipboard className="h-3.5 w-3.5" />
                    Copy invitation
                  </button>
                </>
              )}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]";
