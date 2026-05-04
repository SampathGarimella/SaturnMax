import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  KeyRound,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import Logo from "../components/Logo";
import LoginMenu from "../components/LoginMenu";
import DashboardThemeToggle from "../components/DashboardThemeToggle";
import {
  ActionBar,
  ConfirmModal,
  EmptyState,
  InlineError,
  LoadingState,
  SearchInput,
  SectionHeader,
  StatusBadge,
} from "../components/ui";
import {
  adminDeactivatePortalUser,
  adminSendPasswordReset,
  adminUpsertPortalUser,
  deleteJob,
  fetchOperationsData,
  saveJob,
  updateJobStatus,
} from "../lib/api";
import { PERMISSION_MATRIX } from "../lib/constants";

const EMPTY_DATA = {
  jobs: [],
  users: [],
  candidates: [],
  consultants: [],
  applications: [],
  reviews: [],
  activityLogs: [],
  messageThreads: [],
  leads: [],
};

const EMPTY_USER = {
  uid: "",
  name: "",
  email: "",
  phone: "",
  role: "candidate",
  title: "",
  department: "",
  location: "",
  status: "active",
  sendReset: true,
};

const EMPTY_JOB = {
  id: "",
  title: "",
  department: "Engineering",
  employment_type: "Full-time",
  work_mode: "Remote",
  owner: "",
  clientName: "",
  priority: "Medium",
  hiringType: "Full-time",
  location: "Remote",
  experience: "2-5 yrs exp",
  tags: "Full-time, Remote",
  description: "",
  status: "published",
};

const TABS = [
  { id: "users", label: "Accounts", Icon: Users },
  { id: "consultants", label: "Consultants", Icon: UserCog },
  { id: "jobs", label: "Jobs", Icon: BriefcaseBusiness },
  { id: "activity", label: "Activity", Icon: ShieldCheck },
  { id: "permissions", label: "Permissions", Icon: BookOpenCheck },
];

export default function AdminDashboard() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState("users");
  const [query, setQuery] = useState("");
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [jobForm, setJobForm] = useState(EMPTY_JOB);
  const [deleteJobTarget, setDeleteJobTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchOperationsData());
    } catch (err) {
      setError(err?.message || "Could not load admin data.");
      toast.error(err?.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const users = useMemo(() => {
    return data.users
      .filter((item) => [item.name, item.email, item.role, item.status].join(" ").toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => String(a.role || "").localeCompare(String(b.role || "")));
  }, [data.users, query]);

  const consultants = useMemo(() => {
    return data.consultants.filter((item) => [item.name, item.email, item.client, item.project, item.consultantId].join(" ").toLowerCase().includes(query.toLowerCase()));
  }, [data.consultants, query]);

  const jobs = useMemo(() => {
    return data.jobs.filter((item) => [item.title, item.department, item.status].join(" ").toLowerCase().includes(query.toLowerCase()));
  }, [data.jobs, query]);

  const stats = [
    { label: "Employees", value: data.users.filter((u) => u.role === "employee").length },
    { label: "Consultants", value: data.consultants.length },
    { label: "Candidates", value: data.users.filter((u) => u.role === "candidate").length || data.candidates.length },
    { label: "Published jobs", value: data.jobs.filter((j) => j.status === "published").length },
  ];

  const editUser = (item) => {
    setTab("users");
    setUserForm({
      uid: item.uid || item.id || "",
      name: item.name || "",
      email: item.email || "",
      phone: item.phone || "",
      role: item.role || "candidate",
      title: item.title || item.roleTitle || "",
      department: item.department || "",
      location: item.location || item.workLocation || "",
      status: item.status || "active",
      sendReset: false,
    });
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setBusy("user");
    try {
      const result = await adminUpsertPortalUser(userForm);
      toast.success(userForm.uid ? "Account updated." : "Account created.");
      if (result.loginSetupRequired) {
        toast.info("Auth login still needs setup.", {
          description: "Deploy the admin Cloud Function or create this Auth user in Firebase Console.",
        });
      }
      setUserForm(EMPTY_USER);
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not save account.");
    } finally {
      setBusy("");
    }
  };

  const sendReset = async (item) => {
    setBusy(`${item.id}-reset`);
    try {
      const role = item.role || "";
      const url = role === "consultant" ? "https://saturnmax.com/consultant-login" : role === "employee" || role === "admin" ? "https://saturnmax.com/employee-login" : "https://saturnmax.com/login";
      await adminSendPasswordReset(item.email, url);
      toast.success(`Password setup/reset email sent to ${item.email}.`);
    } catch (err) {
      toast.error(err?.message || "Could not send reset email.");
    } finally {
      setBusy("");
    }
  };

  const deactivateUser = async () => {
    if (!deactivateTarget) return;
    setBusy(`${deactivateTarget.id}-deactivate`);
    try {
      await adminDeactivatePortalUser({ uid: deactivateTarget.uid || deactivateTarget.id, role: deactivateTarget.role });
      toast.success("Account deactivated.");
      setDeactivateTarget(null);
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not deactivate account.");
    } finally {
      setBusy("");
    }
  };

  const saveJobRecord = async (event) => {
    event.preventDefault();
    setBusy("job");
    try {
      await saveJob(jobForm);
      toast.success(jobForm.id ? "Job updated." : "Job posted.");
      setJobForm(EMPTY_JOB);
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not save job.");
    } finally {
      setBusy("");
    }
  };

  const removeJob = async () => {
    if (!deleteJobTarget) return;
    setBusy(`${deleteJobTarget.id}-delete`);
    try {
      await deleteJob(deleteJobTarget.id);
      toast.success("Job archived.");
      setDeleteJobTarget(null);
      await load();
    } catch (err) {
      toast.error(err?.message || "Could not delete job.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="dashboard-surface min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 md:px-10">
          <Logo to="/admin-dashboard" />
          <div className="flex items-center gap-2">
            <button onClick={load} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <DashboardThemeToggle />
            <LoginMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-10 md:py-8">
        <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl bg-[#0A192F] p-6 text-white md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin portal
            </div>
            <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-white">
              Account, role, consultant, and job administration.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Create or update portal records, assign roles, send password setup emails, and manage published jobs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{stat.label}</div>
                <div className="mt-2 font-heading text-3xl font-bold text-slate-900">{loading ? "..." : stat.value}</div>
              </div>
            ))}
          </div>
        </section>

        <nav className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3" aria-label="Admin sections">
          <div className="flex min-w-max gap-2">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold ${tab === id ? "bg-[#2563EB] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </nav>

        {error && <InlineError title="Admin data did not load" body={error} onRetry={load} className="mb-5" />}
        {loading ? (
          <LoadingState label="Loading admin workspace..." />
        ) : (
          <div className="space-y-5">
            <ActionBar>
              <SearchInput value={query} onChange={setQuery} placeholder="Search accounts, consultants, jobs, or activity" />
            </ActionBar>
            {tab === "users" && (
              <AccountsPanel
                users={users}
                form={userForm}
                setForm={setUserForm}
                busy={busy}
                onSave={saveUser}
                onEdit={editUser}
                onReset={sendReset}
                onDeactivate={setDeactivateTarget}
              />
            )}
            {tab === "consultants" && <ConsultantsPanel consultants={consultants} onEdit={editUser} />}
            {tab === "jobs" && (
              <JobsPanel
                jobs={jobs}
                form={jobForm}
                setForm={setJobForm}
                busy={busy}
                onSave={saveJobRecord}
                onDelete={setDeleteJobTarget}
                onStatus={async (job, status) => {
                  setBusy(`${job.id}-${status}`);
                  try {
                    await updateJobStatus(job.id, status);
                    toast.success(`Job marked ${status}.`);
                    await load();
                  } catch (err) {
                    toast.error(err?.message || "Could not update job.");
                  } finally {
                    setBusy("");
                  }
                }}
              />
            )}
            {tab === "activity" && <ActivityPanel logs={data.activityLogs} />}
            {tab === "permissions" && <PermissionsPanel />}
          </div>
        )}
      </main>

      <ConfirmModal
        open={Boolean(deleteJobTarget)}
        title="Archive job?"
        body={deleteJobTarget ? `This removes ${deleteJobTarget.title} from public careers while keeping applications and history.` : ""}
        confirmLabel="Archive job"
        destructive
        busy={Boolean(busy && busy.endsWith("-delete"))}
        onConfirm={removeJob}
        onCancel={() => setDeleteJobTarget(null)}
      />
      <ConfirmModal
        open={Boolean(deactivateTarget)}
        title="Deactivate account?"
        body={deactivateTarget ? `This stops portal access for ${deactivateTarget.email || deactivateTarget.name}. Records and activity history remain for audit and support.` : ""}
        confirmLabel="Deactivate"
        destructive
        busy={Boolean(busy && busy.endsWith("-deactivate"))}
        onConfirm={deactivateUser}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}

function AccountsPanel({ users, form, setForm, busy, onSave, onEdit, onReset, onDeactivate }) {
  return (
    <section className="space-y-5">
      <SectionHeader eyebrow="Accounts" title="Manage portal users and roles" description="Choose the account type first, then create or update only the fields needed for that portal role. Setup/reset emails use the neutral Firebase password template." />
      <form onSubmit={onSave} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
          Candidates may self-sign up. Consultants, employees, and admins should be created or invited by SaturnMax from this admin page.
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Account type">
            <select className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="candidate">Candidate</option>
              <option value="consultant">Consultant</option>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Full name"><input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Email"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></Field>
          <Field label="Department"><input className={inputClass} value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></Field>
          <Field label="Location"><input className={inputClass} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={form.sendReset} onChange={(e) => setForm((f) => ({ ...f, sendReset: e.target.checked }))} />
            Send password setup email
          </label>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {form.uid && (
            <button type="button" onClick={() => setForm(EMPTY_USER)} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Clear edit
            </button>
          )}
          <button disabled={busy === "user"} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
            <Save className="h-4 w-4" />
            {busy === "user" ? "Saving..." : form.uid ? "Update account" : "Create account"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {users.length === 0 && <EmptyState title="No accounts match this view" body="Create an account or change your search." className="m-4" />}
        {users.map((item) => (
          <article key={item.uid || item.id} className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 last:border-b-0 lg:grid-cols-[1.1fr_0.7fr_0.7fr_1fr] lg:items-center">
            <div>
              <div className="font-semibold text-slate-900">{item.name || item.email}</div>
              <div className="mt-1 text-xs text-slate-500">{item.email}</div>
            </div>
            <StatusBadge value={item.role || "candidate"} withIcon={false} />
            <StatusBadge value={item.status || "active"} withIcon={false} />
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button onClick={() => onEdit(item)} className={smallButtonClass}>Edit</button>
              <button onClick={() => onReset(item)} className={smallButtonClass}><KeyRound className="h-3.5 w-3.5" /> Invite/Reset</button>
              <button onClick={() => onDeactivate(item)} className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" /> Deactivate</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConsultantsPanel({ consultants, onEdit }) {
  return (
    <section className="space-y-5">
      <SectionHeader eyebrow="Consultants" title="Consultant roster" description="Review consultant details and jump into account editing when needed." />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {consultants.length === 0 && <EmptyState title="No consultants match this view" body="Converted and manually added consultants appear here." className="lg:col-span-2" />}
        {consultants.map((item) => (
          <article key={item.uid || item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-lg font-semibold text-slate-900">{item.name || item.email}</div>
                <div className="mt-1 text-xs text-slate-500">{item.consultantId || item.email}</div>
              </div>
              <StatusBadge value={item.status || "active"} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Mini label="Email" value={item.email || "Not set"} />
              <Mini label="Role" value={item.roleTitle || item.role || "Not set"} />
              <Mini label="Client" value={item.client || item.clientName || "Pending"} />
              <Mini label="Pay" value={item.monthlyPay || item.rate || "Pending"} />
            </div>
            <button onClick={() => onEdit({ ...item, role: "consultant" })} className={`${smallButtonClass} mt-4`}>Edit account</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function JobsPanel({ jobs, form, setForm, busy, onSave, onDelete, onStatus }) {
  return (
    <section className="space-y-5">
      <SectionHeader eyebrow="Jobs" title="Post and modify jobs" description="Published roles appear on saturnmax.com and in the Candidate Portal." />
      <form onSubmit={onSave} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Job title"><input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></Field>
          <Field label="Department"><input className={inputClass} value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></Field>
          <Field label="Employment type"><input className={inputClass} value={form.employment_type} onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))} /></Field>
          <Field label="Work mode"><input className={inputClass} value={form.work_mode} onChange={(e) => setForm((f) => ({ ...f, work_mode: e.target.value }))} /></Field>
          <Field label="Experience"><input className={inputClass} value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))} /></Field>
          <Field label="Internal owner"><input className={inputClass} value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} /></Field>
          <Field label="Client name"><input className={inputClass} value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} /></Field>
          <Field label="Priority">
            <select className={inputClass} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </Field>
          <Field label="Hiring type"><input className={inputClass} value={form.hiringType} onChange={(e) => setForm((f) => ({ ...f, hiringType: e.target.value }))} /></Field>
          <Field label="Location"><input className={inputClass} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></Field>
          <Field label="Tags"><input className={inputClass} value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} /></Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2"><textarea className={`${inputClass} h-28 resize-none py-3`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {form.id && <button type="button" onClick={() => setForm(EMPTY_JOB)} className={smallButtonClass}>Clear edit</button>}
          <button disabled={busy === "job"} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
            <Plus className="h-4 w-4" />
            {busy === "job" ? "Saving..." : form.id ? "Update job" : "Post job"}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {jobs.length === 0 && <EmptyState title="No jobs match this view" body="Post a role or change your search." className="lg:col-span-2" />}
        {jobs.map((job) => (
          <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-lg font-semibold text-slate-900">{job.title}</div>
                <div className="mt-1 text-xs text-slate-500">{job.department} / {job.employment_type}</div>
              </div>
              <StatusBadge value={job.status} />
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-slate-600">{job.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setForm({ ...job, tags: (job.tags || []).join(", ") })} className={smallButtonClass}>Edit</button>
              {["published", "paused", "closed", "archived"].map((status) => <button key={status} onClick={() => onStatus(job, status)} className={smallButtonClass}>{status}</button>)}
              <button onClick={() => onDelete(job)} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Archive</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({ logs }) {
  return (
    <section className="space-y-5">
      <SectionHeader eyebrow="Activity" title="Admin audit trail" description="Recent sensitive actions and workflow updates." />
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {logs.length === 0 && <EmptyState title="No activity yet" body="Role changes, resets, job edits, and workflow changes will appear here." />}
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-slate-200 p-4 text-sm">
              <div className="font-semibold text-slate-900">{String(log.action || "activity").replace(/_/g, " ")}</div>
              <div className="mt-1 text-xs text-slate-500">{log.actorEmail || log.actorUid || "System"} / {log.targetCollection || "record"} / {log.targetId || "target"}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PermissionsPanel() {
  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow="Permissions"
        title="Role permission matrix"
        description="This is the working access chart used to keep candidate, consultant, employee, and admin responsibilities separate."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {PERMISSION_MATRIX.map((row) => (
          <article key={row.role} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="font-heading text-lg font-semibold text-slate-900">{row.role}</div>
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950">
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Can do</div>
              <p className="mt-1 leading-relaxed">{row.canDo}</p>
            </div>
            <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-950">
              <div className="text-xs font-bold uppercase tracking-wide text-rose-700">Cannot do</div>
              <p className="mt-1 leading-relaxed">{row.cannotDo}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
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

function Mini({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

const smallButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
