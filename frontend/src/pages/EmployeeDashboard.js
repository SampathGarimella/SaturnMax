import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  FileText,
  Plus,
  RefreshCw,
  Search,
  UserCog,
  Users,
} from "lucide-react";
import Logo from "../components/Logo";
import { getLoginEvents } from "../lib/session";
import {
  STORAGE_KEYS,
  employeeCandidates,
  employeeConsultants,
  employeeProjects,
  employeeStats,
} from "../data/demoPortals";

export default function EmployeeDashboard() {
  const [manualPeople, setManualPeople] = useState(loadManualPeople);
  const [loginEvents, setLoginEvents] = useState(getLoginEvents);
  const [form, setForm] = useState({
    type: "Candidate",
    name: "",
    email: "",
    role: "",
    status: "New",
  });

  const people = useMemo(
    () => [
      ...manualPeople,
      ...employeeCandidates.map((person) => ({ ...person, type: "Candidate", status: person.stage })),
      ...employeeConsultants.map((person) => ({ ...person, type: "Consultant", status: person.status })),
    ],
    [manualPeople]
  );

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) {
      toast.error("Add name, email, and role.");
      return;
    }
    const next = [
      {
        id: `${Date.now()}-${form.email}`,
        ...form,
        source: "Manual employee entry",
      },
      ...manualPeople,
    ];
    setManualPeople(next);
    localStorage.setItem(STORAGE_KEYS.manualPeople, JSON.stringify(next));
    setForm({ type: "Candidate", name: "", email: "", role: "", status: "New" });
    toast.success("Manual record added.");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 min-h-16 py-2 flex items-center justify-between gap-3">
          <Logo to="/employee-dashboard" />
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-medium text-slate-600">
              Employee dashboard
            </span>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#2563EB] font-medium">
              <ArrowLeft className="h-4 w-4" />
              Website
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-5">
          <div className="rounded-2xl bg-[#0A192F] p-7 md:p-8 text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              <UserCog className="h-3.5 w-3.5" />
              Operations command center
            </div>
            <h1 className="mt-5 font-heading text-3xl md:text-4xl font-semibold tracking-tight text-white">
              Candidates, consultants, clients, and documents in one place.
            </h1>
            <p className="mt-4 text-sm text-white/65 leading-relaxed">
              Manage candidates, consultants, project activity, and compliance documents
              from a single operations workspace.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {employeeStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">
                  {stat.label}
                </div>
                <div className="mt-3 font-heading text-4xl font-bold text-slate-900">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs font-medium text-[#2563EB]">{stat.delta}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-5">
          <Panel title="Manual add" subtitle="Create candidate, consultant, or employee records">
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Type">
                <select
                  value={form.type}
                  onChange={(e) => setForm((value) => ({ ...value, type: e.target.value }))}
                  className={inputClass}
                >
                  <option>Candidate</option>
                  <option>Consultant</option>
                  <option>Employee</option>
                </select>
              </Field>
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm((value) => ({ ...value, name: e.target.value }))}
                  className={inputClass}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((value) => ({ ...value, email: e.target.value }))}
                  className={inputClass}
                  placeholder="person@email.com"
                />
              </Field>
              <Field label="Role or skill">
                <input
                  value={form.role}
                  onChange={(e) => setForm((value) => ({ ...value, role: e.target.value }))}
                  className={inputClass}
                  placeholder="React Consultant"
                />
              </Field>
              <div className="md:col-span-2 flex justify-end">
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] md:w-auto">
                  <Plus className="h-4 w-4" />
                  Add record
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Recently logged in" subtitle="Recent sign-ins across all role portals">
            <div className="flex flex-col justify-between gap-3 mb-4 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                {loginEvents.length} recent login events
              </div>
              <button
                onClick={() => setLoginEvents(getLoginEvents())}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {loginEvents.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  No login events yet.
                </div>
              )}
              {loginEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{event.name}</div>
                      <div className="text-xs text-slate-500">{event.email}</div>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 capitalize">
                      {event.role}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleString()} - {event.mode}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
          <Panel title="People directory" subtitle="Candidates, consultants, and manual employee-created entries">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[0.7fr_1.1fr_1fr_0.8fr] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  <div>Type</div>
                  <div>Name</div>
                  <div>Role</div>
                  <div>Status</div>
                </div>
                {people.map((person) => (
                  <div
                    key={`${person.type}-${person.email}`}
                    className="grid grid-cols-[0.7fr_1.1fr_1fr_0.8fr] px-4 py-3 text-sm border-t border-slate-100 bg-white"
                  >
                    <div className="font-medium text-[#2563EB]">{person.type}</div>
                    <div>
                      <div className="font-semibold text-slate-900">{person.name}</div>
                      <div className="text-xs text-slate-500">{person.email}</div>
                    </div>
                    <div className="text-slate-600">{person.role}</div>
                    <div className="text-slate-600">{person.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Client projects" subtitle="Consultant assignment and delivery health">
            <div className="space-y-3">
              {employeeProjects.map((project) => (
                <div key={project.client} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{project.client}</div>
                      <div className="text-xs text-slate-500">Owner: {project.owner}</div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        project.health === "Green"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {project.health}
                    </span>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 text-[#2563EB]" />
                    {project.nextStep}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <OpsCard Icon={Users} title="Candidates" body="Track resumes, screenings, interviews, and offers." />
          <OpsCard Icon={BriefcaseBusiness} title="Consultants" body="Track pay, projects, client assignments, KYC, tax, and onboarding." />
          <OpsCard Icon={FileText} title="Documents" body="Maintain agreements, tax docs, and onboarding records." />
        </section>
      </main>
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function loadManualPeople() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.manualPeople);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function OpsCard({ Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
