import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  MessageSquare,
  User,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  ArrowRight,
} from "lucide-react";
import Logo from "./Logo";
import { fetchDashboard } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const NAV_MAIN = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard", exact: true },
  { to: "/dashboard/jobs", icon: Briefcase, label: "Browse jobs", testId: "nav-jobs" },
  { to: "/dashboard/applications", icon: FileText, label: "My applications", testId: "nav-applications" },
  { to: "/dashboard/messages", icon: MessageSquare, label: "Messages", testId: "nav-messages", badge: 3 },
];

const NAV_ACCOUNT = [
  { to: "/dashboard/profile", icon: User, label: "My profile", testId: "nav-profile" },
  { to: "/dashboard/settings", icon: SettingsIcon, label: "Settings", testId: "nav-settings" },
];

export default function DashboardLayout() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, mode, signOut } = useAuth();

  // Fetch dashboard data from the FastAPI backend keyed by candidate email.
  useEffect(() => {
    if (authLoading || !user?.email) return;
    setLoading(true);
    fetchDashboard(user.email)
      .then(setData)
      .catch((err) => {
        console.error(err);
        // For real Firebase users who haven't submitted any applications yet, the
        // backend will return 404. Build an empty shell so the UI stays usable.
        if (err?.response?.status === 404) {
          setData(emptyDashboard(user));
        } else {
          toast.error("Couldn't load your dashboard data.");
        }
      })
      .finally(() => setLoading(false));
  }, [authLoading, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out.");
    navigate("/");
  };

  const reload = () => {
    if (!user?.email) return;
    fetchDashboard(user.email).then(setData).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-screen">
        <aside
          className="hidden lg:flex flex-col bg-white border-r border-slate-200"
          data-testid="dashboard-sidebar"
        >
          <div className="px-5 py-5 border-b border-slate-200">
            <Logo to="/dashboard" />
          </div>

          <div className="px-4 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="avatar-ring">
                <div className="h-10 w-10 rounded-full bg-[#2563EB] text-white grid place-items-center text-sm font-semibold">
                  {initials(user?.name || data?.candidate?.name || "Candidate")}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {user?.name || data?.candidate?.name || "Candidate"}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  {data?.candidate?.role_label || "Job Candidate"}
                  {mode === "firebase" && (
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 font-semibold uppercase tracking-wider">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
            <NavGroup title="Main">
              {NAV_MAIN.map((item) => (
                <SideNavLink key={item.to} {...item} />
              ))}
            </NavGroup>
            <NavGroup title="Account">
              {NAV_ACCOUNT.map((item) => (
                <SideNavLink key={item.to} {...item} />
              ))}
            </NavGroup>
          </nav>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-5 py-4 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-t border-slate-200"
            data-testid="sign-out-button"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <div className="flex flex-col">
          <header
            className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-5 md:px-10 min-h-20 py-3 flex items-center justify-between gap-4"
            data-testid="dashboard-topbar"
          >
            <div className="min-w-0">
              <h1 className="font-heading text-xl md:text-2xl font-semibold tracking-tight text-slate-900 truncate">
                {loading || authLoading
                  ? "Loading your dashboard…"
                  : `${greeting()}, ${firstName(user?.name || "there")}`}
              </h1>
              <p className="text-xs md:text-sm text-slate-500">
                Here's what's happening with your account today.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="relative h-10 w-10 grid place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                data-testid="notifications-bell"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 text-slate-600" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#2563EB] pulse-dot" />
              </button>
              <Link
                to="/dashboard/jobs"
                className="hidden md:inline-flex h-10 items-center gap-2 rounded-md bg-[#0A192F] px-4 text-sm font-medium text-white hover:bg-[#0e2445] transition-colors shadow-sm"
                data-testid="view-open-jobs"
              >
                View open jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          <nav
            className="lg:hidden border-b border-slate-200 bg-white px-3 py-2 overflow-x-auto"
            aria-label="Dashboard mobile navigation"
          >
            <div className="flex min-w-max gap-2">
              {[...NAV_MAIN, ...NAV_ACCOUNT].map((item) => (
                <MobileNavLink key={item.to} {...item} />
              ))}
            </div>
          </nav>

          <main className="p-4 sm:p-5 md:p-10" key={location.pathname}>
            <Outlet context={{ data, loading: loading || authLoading, reload, user, mode }} />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---- helpers ---------------------------------------------------------- */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name) {
  return name?.split(" ")[0] || "there";
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function emptyDashboard(user) {
  return {
    candidate: {
      id: "new",
      email: user.email,
      name: user.name,
      role_label: "Job Candidate",
      profile_complete_percent: 20,
      profile_checklist: {
        basic_info: true,
        work_preference: false,
        portfolio_url: false,
        resume_uploaded: false,
      },
    },
    stats: {
      applications_sent: 0,
      applications_delta_week: 0,
      interviews_scheduled: 0,
      next_interview: null,
      profile_views: 0,
      profile_views_delta_week: 0,
      profile_complete_percent: 20,
    },
    applications: [],
    activity: [],
    unread_messages: 0,
  };
}

/* ---- Side nav pieces --------------------------------------------------- */
function NavGroup({ title, children }) {
  return (
    <div>
      <div className="px-3 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold mb-2">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SideNavLink({ to, icon: Icon, label, testId, badge, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      data-testid={testId}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-[#2563EB]/10 text-[#1D4ED8] font-semibold"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#2563EB]" />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{label}</span>
          {badge ? (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function MobileNavLink({ to, icon: Icon, label, testId, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      data-testid={`${testId}-mobile`}
      className={({ isActive }) =>
        `inline-flex h-10 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors ${
          isActive
            ? "bg-[#2563EB] text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </NavLink>
  );
}
