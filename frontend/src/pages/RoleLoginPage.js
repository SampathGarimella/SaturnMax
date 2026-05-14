import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, UserCog, BriefcaseBusiness } from "lucide-react";
import Logo from "../components/Logo";
import LoginMenu from "../components/LoginMenu";
import { useAuth } from "../context/AuthContext";
import { recordLoginEvent } from "../lib/api";
import {
  ROLE_HOME,
  ROLE_PORTAL_LABEL,
  ROLE_PORTAL_NAME,
  ROLE_STATUS,
} from "../lib/constants";

const CONFIG = {
  consultant: {
    title: "Consultant login",
    eyebrow: "Consultant portal",
    destination: "/consultant-dashboard",
    allowedRoles: ["consultant"],
    Icon: BriefcaseBusiness,
  },
  employee: {
    title: "Employee/Admin Login",
    eyebrow: "Operations portal",
    destination: "/employee-dashboard/hiring/candidates",
    allowedRoles: ["employee", "admin"],
    Icon: UserCog,
  },
};

export default function RoleLoginPage({ role = "consultant" }) {
  const config = CONFIG[role] || CONFIG.consultant;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { signIn, signOut, user, loading, isFirebaseConfigured } = useAuth();
  const Icon = config.Icon;
  const redirectNoticeShown = useRef(false);

  useEffect(() => {
    if (
      loading ||
      redirectNoticeShown.current ||
      !user?.uid ||
      user.roleStatus !== ROLE_STATUS.READY ||
      !user.role
    ) {
      return;
    }

    redirectNoticeShown.current = true;
    const target = ROLE_HOME[user.role] || "/";
    const samePortal = config.allowedRoles.includes(user.role);

    if (!samePortal) {
      const activePortal = ROLE_PORTAL_NAME[user.role] || "your portal";
      toast.warning(`You're already logged in to ${activePortal}.`, {
        description: `Log out first to use ${config.eyebrow}.`,
      });
    }

    navigate(target, { replace: true });
  }, [
    config.allowedRoles,
    config.eyebrow,
    loading,
    navigate,
    user?.role,
    user?.roleStatus,
    user?.uid,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      toast.error("Sign-in is temporarily unavailable.");
      return;
    }
    setBusy(true);
    try {
      const signedUser = await signIn({ email, password, keepSignedIn: true });
      if (signedUser?.roleStatus !== ROLE_STATUS.READY) {
        toast.error(signedUser?.roleError || "Your account role needs setup.");
        navigate(config.destination);
        return;
      }
      if (!config.allowedRoles.includes(signedUser.role)) {
        await signOut();
        toast.error(
          `This account belongs to ${ROLE_PORTAL_LABEL[signedUser?.role] || "another portal"}.`
        );
        return;
      }
      recordLoginEvent({
        name: email.split("@")[0],
        email,
        role: signedUser.role,
        title: config.title,
        mode: "firebase",
      }).catch(() => {});
      toast.success("Welcome back.", {
        description: `Opening ${ROLE_PORTAL_NAME[signedUser.role] || config.eyebrow}.`,
      });
      navigate(ROLE_HOME[signedUser.role] || config.destination);
    } catch (err) {
      if (err?.code === "auth/user-disabled") {
        toast.error("Your account is inactive. Contact hr@saturnmax.com.");
      } else {
        toast.error(err?.message || "Sign-in failed. Please verify your credentials.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="relative z-[60] border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <LoginMenu />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start">
        <section className="rounded-2xl bg-[#0A192F] p-8 md:p-10 text-white overflow-hidden relative">
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[#2563EB]/20" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
              <Icon className="h-3.5 w-3.5" />
              {config.eyebrow}
            </span>
            <h1 className="mt-5 font-heading text-4xl md:text-5xl font-semibold tracking-tight text-white">
              {config.title}
            </h1>
            <p className="mt-4 text-sm md:text-base text-white/70 leading-relaxed">
              Sign in with your assigned SaturnMax work account.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 md:p-9 shadow-sm">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Use your assigned work credentials to access this portal.
          </p>
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            Use your invitation email to set your password. Contact{" "}
            <a href="mailto:hr@saturnmax.com" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
              hr@saturnmax.com
            </a>{" "}
            if you need a new invite or password setup link.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1.5">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className={inputClass}
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1.5">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className={`${inputClass} pr-11`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0A192F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0e2445] transition-colors disabled:opacity-60"
            >
              {busy ? "Signing in..." : `Sign in to ${config.eyebrow.toLowerCase()}`}
            </button>
          </form>

          {!isFirebaseConfigured && (
            <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900 flex items-start gap-3">
              <div>
                <div className="font-semibold">Sign-in service unavailable</div>
                <div className="text-xs mt-0.5">
                  Please contact{" "}
                  <a href="mailto:info@saturnmax.com" className="font-semibold underline">
                    info@saturnmax.com
                  </a>{" "}
                  for access support.
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";
