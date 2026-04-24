import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
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
import { clearSession, getSession, setSession, DEMO_EMAIL } from "../lib/session";
import { fetchDashboard } from "../lib/api";
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

  useEffect(() => {
    // Auto-bootstrap a demo session so the dashboard never shows a broken state.
    let session = getSession();
    if (!session) {
      session = { email: DEMO_EMAIL, name: "Rahul Sharma" };
      setSession(session);
    }

    fetchDashboard(session.email)
      .then((payload) => setData(payload))
      .catch((err) => {
        console.error(err);
        toast.error("Couldn't load your dashboard data.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSignOut = () => {
    clearSession();
    toast.success("Signed out.");
    navigate("/");
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
                  {initials(data?.candidate?.name || "Rahul Sharma")}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {data?.candidate?.name || "Rahul Sharma"}
                </div>
                <div className="text-xs text-slate-500">
                  {data?.candidate?.role_label || "Job Candidate"}
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
          {/* Top bar */}
          <header
            className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-5 md:px-10 h-20 flex items-center justify-between gap-4"
            data-testid="dashboard-topbar"
          >
            <div className="min-w-0">
              <h1 className="font-heading text-xl md:text-2xl font-semibold tracking-tight text-slate-900 truncate">
                {loading
                  ? "Loading your dashboard…"
                  : `${greeting()}, ${firstName(data?.candidate?.name || "there")}`}
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
                className="hidden md:inline-flex items-center gap-2 rounded-md bg-[#0A192F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0e2445] transition-colors shadow-sm"
                data-testid="view-open-jobs"
              >
                View open jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </header>

          {/* Main area — children via Outlet with context */}
          <main className="p-5 md:p-10">
            <Outlet context={{ data, loading, reload: () => {
              const session = getSession();
              if (!session) return;
              fetchDashboard(session.email).then(setData).catch(() => {});
            } }} />
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
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
