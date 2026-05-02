import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Shield, UserCog, BriefcaseBusiness } from "lucide-react";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { DEMO_PROFILES, recordLogin } from "../lib/session";

const CONFIG = {
  consultant: {
    title: "Consultant login",
    eyebrow: "Consultant portal",
    description:
      "View project, client, payout, onboarding, tax, and document details assigned by the operations team.",
    destination: "/consultant-dashboard",
    demoLabel: "Enter consultant demo",
    demoRole: "consultant",
    Icon: BriefcaseBusiness,
  },
  employee: {
    title: "Employee login",
    eyebrow: "Employee portal",
    description:
      "Manage candidates, consultants, projects, documents, and recent login activity for the team.",
    destination: "/employee-dashboard",
    demoLabel: "Enter employee demo",
    demoRole: "employee",
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
  const { signIn, enterDemo, isFirebaseConfigured } = useAuth();
  const Icon = config.Icon;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      toast.info("Firebase is not configured yet. Use demo access for now.");
      return;
    }
    setBusy(true);
    try {
      await signIn({ email, password, keepSignedIn: true });
      recordLogin({
        name: email.split("@")[0],
        email,
        role,
        title: config.title,
        mode: "firebase",
      });
      toast.success(`Welcome to the ${config.eyebrow.toLowerCase()}.`);
      navigate(config.destination);
    } catch (err) {
      toast.error(err?.message || "Sign-in failed. Check Firebase Auth setup.");
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = () => {
    const profile = DEMO_PROFILES[config.demoRole];
    enterDemo(config.demoRole);
    toast.success(`Signed in as ${profile.name}`);
    navigate(config.destination);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </Link>
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
              {config.description}
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <PortalPoint label="Firebase Auth" value="Email/password ready" />
              <PortalPoint label="Firestore role" value={`users/{uid}.role = ${role}`} />
              <PortalPoint label="Storage" value={role === "consultant" ? "consultant-documents/{uid}" : "employee-documents/{uid}"} />
              <PortalPoint label="Demo mode" value="Local preview enabled" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 md:p-9 shadow-sm">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Use Firebase Auth when configured, or preview the role dashboard with demo access.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="block text-sm text-slate-600 mb-1.5">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={DEMO_PROFILES[config.demoRole].email}
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
                  placeholder="Firebase password"
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
              {busy ? "Signing in..." : `Sign in as ${role}`}
            </button>
          </form>

          {!isFirebaseConfigured && (
            <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-sm text-amber-900 flex items-start gap-3">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Firebase not configured yet</div>
                <div className="text-xs mt-0.5">
                  Use demo access now. Later, store role data in Firestore and protect it with
                  the rules in FIREBASE_SETUP.md.
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleDemo}
            className="mt-5 w-full rounded-md border border-[#2563EB]/30 bg-blue-50 px-5 py-3 text-sm font-semibold text-[#1D4ED8] hover:bg-blue-100 transition-colors"
          >
            {config.demoLabel}
          </button>
        </section>
      </main>
    </div>
  );
}

const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function PortalPoint({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-white/45 font-semibold">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
