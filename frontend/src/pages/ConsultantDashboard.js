import React from "react";
import { Link } from "react-router-dom";
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
  ShieldCheck,
} from "lucide-react";
import Logo from "../components/Logo";
import {
  consultantDocuments,
  consultantOnboarding,
  consultantProfile,
  consultantProjectMilestones,
} from "../data/demoPortals";

export default function ConsultantDashboard() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <PortalHeader title="Consultant dashboard" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-10 space-y-6">
        <section className="rounded-2xl bg-[#0A192F] text-white p-7 md:p-9 overflow-hidden relative">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[#2563EB]/15" />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold">
                {consultantProfile.consultantId}
              </div>
              <h1 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-white">
                {consultantProfile.name}
              </h1>
              <p className="mt-3 text-white/70">
                {consultantProfile.role} based in {consultantProfile.location}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge>{consultantProfile.status}</Badge>
                <Badge>{consultantProfile.panStatus}</Badge>
                <Badge>{consultantProfile.bankStatus}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Metric Icon={Building2} label="Client" value={consultantProfile.client} />
              <Metric Icon={BriefcaseBusiness} label="Project" value={consultantProfile.project} />
              <Metric Icon={Banknote} label="Monthly pay" value={consultantProfile.monthlyPay} />
              <Metric Icon={CalendarDays} label="Next payout" value={consultantProfile.nextPayout} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-5">
          <Panel title="Onboarding and India compliance" subtitle="Tax, bank, and client readiness">
            <div className="space-y-3">
              {consultantOnboarding.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-slate-800">
                    {item.done ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <CircleDot className="h-4 w-4 text-amber-500" />
                    )}
                    {item.label}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      item.done
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.done ? "Done" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Project milestones" subtitle="Assigned by the employee operations team">
            <div className="grid grid-cols-1 gap-3">
              {consultantProjectMilestones.map((item) => (
                <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">{item.title}</div>
                      <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      {item.date}
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-[#2563EB]">{item.status}</div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
          <Panel title="Documents" subtitle="Managed by operations for secure project delivery">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  <div>Name</div>
                  <div>Type</div>
                  <div>Status</div>
                </div>
                {consultantDocuments.map((doc) => (
                  <div
                    key={doc.name}
                    className="grid grid-cols-[1.3fr_0.8fr_0.8fr] px-4 py-3 text-sm border-t border-slate-100 bg-white"
                  >
                    <div className="font-medium text-slate-900">{doc.name}</div>
                    <div className="text-slate-600">{doc.type}</div>
                    <div className="text-slate-600">{doc.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Pay and tax snapshot" subtitle="Employee-created details for consultant visibility">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MiniCard Icon={Landmark} label="Bank" value={consultantProfile.bankStatus} />
              <MiniCard Icon={ShieldCheck} label="PAN" value={consultantProfile.panStatus} />
              <MiniCard Icon={FileText} label="GST" value={consultantProfile.gstStatus} />
              <MiniCard Icon={Banknote} label="Hours" value={`${consultantProfile.billableHours} billed`} />
            </div>
            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Payroll and statutory compliance are handled through secure finance and
              operations workflows.
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function PortalHeader({ title }) {
  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 min-h-16 py-2 flex items-center justify-between gap-3">
        <Logo to="/consultant-dashboard" />
        <div className="flex items-center gap-3">
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
