import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { toast } from "sonner";
import {
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import Logo from "../components/Logo";
import LoginMenu from "../components/LoginMenu";
import DashboardThemeToggle from "../components/DashboardThemeToggle";
import { InlineError, LoadingState } from "../components/ui";
import { fetchOperationsData } from "../lib/api";
import { isWorkflowTransitionError } from "../lib/workflow";
import { OperationsContext } from "./operations/OperationsContext";

const EMPTY_OPERATIONS_DATA = {
  jobs: [],
  applications: [],
  users: [],
  candidates: [],
  consultants: [],
  reviews: [],
  documents: [],
  leads: [],
  activityLogs: [],
  messageThreads: [],
};

const EMPLOYEE_NAV_GROUPS = [
  {
    title: "Hiring Workflow",
    items: [
      { to: "/employee-dashboard/hiring/candidates", label: "Candidates", Icon: UserRound },
      { to: "/employee-dashboard/hiring/interviews", label: "Interview Reviews", Icon: ClipboardList },
      { to: "/employee-dashboard/hiring/convert", label: "Convert to Consultant", Icon: BriefcaseBusiness },
      { to: "/employee-dashboard/hiring/consultants", label: "Consultants", Icon: Users },
      { to: "/employee-dashboard/hiring/manual-consultant", label: "Manual Add Consultant", Icon: PlusCircle },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/employee-dashboard/jobs", label: "Jobs", Icon: BriefcaseBusiness },
      { to: "/employee-dashboard/messages", label: "Messages", Icon: MessageSquare },
      { to: "/employee-dashboard/reviews", label: "Reviews", Icon: FileText },
      { to: "/employee-dashboard/profile", label: "Profile", Icon: UserCog },
    ],
  },
];

export default function EmployeeDashboard() {
  const [data, setData] = useState(EMPTY_OPERATIONS_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchOperationsData());
    } catch (err) {
      console.error(err);
      setError(err?.message || "Could not load employee data.");
      toast.error(err?.message || "Could not load employee data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const workflowContextFor = useCallback(
    (application) => ({
      application,
      documents: data.documents,
      reviews: data.reviews,
    }),
    [data.documents, data.reviews]
  );

  const showMutationError = useCallback((err, fallback) => {
    console.error(err);
    if (isWorkflowTransitionError(err)) {
      toast.error(err.message, { description: err.details?.nextAction });
      return {
        title: err.message,
        body: err.details?.nextAction || "Review the required workflow steps before trying again.",
      };
    }
    toast.error(err?.message || fallback);
    return { title: fallback, body: err?.message || "" };
  }, []);

  const stats = useMemo(
    () => [
      { label: "Published jobs", value: data.jobs.filter((job) => job.status === "published").length },
      { label: "Candidates", value: data.applications.length || data.candidates.length },
      { label: "Unread threads", value: data.messageThreads.filter((thread) => thread.unreadCount > 0).length },
      { label: "Pending reviews", value: data.reviews.filter((review) => review.status === "pending_review").length },
    ],
    [data]
  );

  const contextValue = useMemo(
    () => ({
      data,
      loading,
      error,
      busy,
      setBusy,
      load,
      workflowContextFor,
      showMutationError,
    }),
    [busy, data, error, load, loading, showMutationError, workflowContextFor]
  );

  return (
    <OperationsContext.Provider value={contextValue}>
      <div className="dashboard-surface min-h-screen bg-[#F8FAFC] text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 md:px-10">
            <Logo to="/employee-dashboard/hiring/candidates" />
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
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
                <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                Employee portal
              </div>
              <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-white">
                Hiring Center for candidate review and consultant conversion.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                Use the section tabs to work one queue at a time.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </div>
                  <div className="mt-2 font-heading text-3xl font-bold text-slate-900">
                    {loading ? "..." : stat.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <nav className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3" aria-label="Employee sections">
            <div className="flex min-w-max gap-5">
              {EMPLOYEE_NAV_GROUPS.map((group) => (
                <div key={group.title} className="flex items-center gap-2">
                  <div className="mr-1 hidden text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 lg:block">
                    {group.title}
                  </div>
                  {group.items.map(({ to, label, Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-[#2563EB] text-white"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
          </nav>

          {error && <InlineError title="Employee data did not load" body={error} onRetry={load} className="mb-5" />}
          {loading && !data.applications.length ? (
            <LoadingState label="Loading employee queues..." />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </OperationsContext.Provider>
  );
}
