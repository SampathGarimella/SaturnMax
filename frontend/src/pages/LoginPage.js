import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, BriefcaseBusiness, Eye, EyeOff, UserCog } from "lucide-react";
import Logo from "../components/Logo";
import LoginMenu from "../components/LoginMenu";
import { useAuth } from "../context/AuthContext";
import {
  ROLE_HOME,
  ROLE_PORTAL_LABEL,
  ROLE_PORTAL_NAME,
  ROLE_STATUS,
  ROLES,
} from "../lib/constants";

const TABS = [
  { id: "signin", label: "Sign in" },
  { id: "signup", label: "Create account" },
];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const applyJob = searchParams.get("applyJob") || window.sessionStorage.getItem("saturnmax.pendingApplyJob") || "";
  const candidateTarget = applyJob ? `/dashboard/jobs?applyJob=${encodeURIComponent(applyJob)}` : "/dashboard";
  const linkedInEnabled = process.env.REACT_APP_ENABLE_LINKEDIN_LOGIN === "true";
  const {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithLinkedIn,
    sendReset,
    signOut,
    user,
    loading,
    isFirebaseConfigured,
  } = useAuth();
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
    const target = user.role === ROLES.CANDIDATE ? candidateTarget : ROLE_HOME[user.role] || "/";

    if (user.role !== ROLES.CANDIDATE) {
      const activePortal = ROLE_PORTAL_NAME[user.role] || "your portal";
      toast.warning(`You're already logged in to ${activePortal}.`, {
        description: "Log out first to use Candidate Portal.",
      });
    }

    navigate(target, { replace: true });
  }, [candidateTarget, loading, navigate, user?.role, user?.roleStatus, user?.uid]);

  const handleError = (err) => {
    const code = err?.code || "";
    const map = {
      "auth/invalid-credential": "Wrong email or password.",
      "auth/invalid-email": "That email address isn't valid.",
      "auth/user-not-found": "No account found with that email.",
      "auth/user-disabled": "Your account is inactive. Contact hr@saturnmax.com.",
      "auth/wrong-password": "Wrong email or password.",
      "auth/email-already-in-use": "An account with that email already exists.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/popup-blocked": "Browser blocked the sign-in popup. Please allow popups.",
      "auth/popup-closed-by-user": "Sign-in popup closed before completing.",
      "auth/unauthorized-domain": "This sign-in domain is not authorized.",
    };
    toast.error(map[code] || err?.message || "Something went wrong. Try again.");
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      toast.error("Sign in is temporarily unavailable. Please contact support.");
      return;
    }
    setBusy(true);
    try {
      let signedUser = null;
      if (tab === "signin") {
        signedUser = await signIn({ email, password, keepSignedIn });
        if (signedUser?.roleStatus !== ROLE_STATUS.READY) {
          toast.error(signedUser?.roleError || "Your account role needs setup.");
          navigate("/dashboard");
          return;
        }
        if (signedUser.role !== ROLES.CANDIDATE) {
          await signOut();
          toast.error(
            `This account belongs to ${ROLE_PORTAL_LABEL[signedUser.role] || "another portal"}.`
          );
          return;
        }
        toast.success("Welcome back.", {
          description: "Opening Candidate Portal.",
        });
      } else {
        signedUser = await signUp({ email, password, name, keepSignedIn });
        if (signedUser?.roleStatus !== ROLE_STATUS.READY) {
          toast.error(signedUser?.roleError || "Your account role needs setup.");
          navigate("/dashboard");
          return;
        }
        toast.success("Account created.", {
          description: "Please verify your email from the link we sent. Opening Candidate Portal.",
        });
      }
      if (applyJob) window.sessionStorage.setItem("saturnmax.pendingApplyJob", applyJob);
      navigate(candidateTarget);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider) => {
    if (!isFirebaseConfigured) {
      toast.error(`${provider} sign-in is temporarily unavailable.`);
      return;
    }
    setBusy(true);
    try {
      let signedUser = null;
      if (provider === "Google") {
        signedUser = await signInWithGoogle();
      } else {
        signedUser = await signInWithLinkedIn();
      }
      if (signedUser?.roleStatus !== ROLE_STATUS.READY) {
        toast.error(signedUser?.roleError || "Your account role needs setup.");
        navigate("/dashboard");
        return;
      }
      if (signedUser.role !== ROLES.CANDIDATE) {
        await signOut();
        toast.error(
          `This account belongs to ${ROLE_PORTAL_LABEL[signedUser.role] || "another portal"}.`
        );
        return;
      }
      toast.success(`Signed in with ${provider}.`, {
        description: "Opening Candidate Portal.",
      });
      navigate(candidateTarget);
    } catch (err) {
      if (err?.code === "auth/operation-not-allowed" && provider === "LinkedIn") {
        toast.error("LinkedIn sign-in is not enabled for this account.");
      } else {
        handleError(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async () => {
    if (!isFirebaseConfigured) {
      toast.error("Password reset is temporarily unavailable.");
      return;
    }
    if (!email) {
      toast.error("Enter your email first, then click Forgot password.");
      return;
    }
    try {
      await sendReset(email);
      toast.success(`Reset link sent to ${email}`);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F1F5FF] via-white to-white">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium"
              data-testid="back-to-home"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <LoginMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-10 md:py-16">
        <div className="w-full max-w-md">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg mb-6" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`py-2.5 text-sm font-medium rounded-md transition-colors ${
                  tab === t.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-7 md:p-9">
            {tab === "signin" ? (
              <>
                <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Sign in to your SaturnMax Technologies account to manage applications and messages.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                  Create your account
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Join SaturnMax Technologies as a candidate. Track applications, interviews, and messages in one place.
                </p>
              </>
            )}

            <div className={`mt-6 grid gap-3 ${linkedInEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
              <OAuthButton
                onClick={() => handleOAuth("Google")}
                dataTestId="oauth-google"
                disabled={busy}
              >
                <GoogleGlyph />
                Google
              </OAuthButton>
              {linkedInEnabled && (
                <OAuthButton
                  onClick={() => handleOAuth("LinkedIn")}
                  dataTestId="oauth-linkedin"
                  disabled={busy}
                >
                  <LinkedInGlyph />
                  LinkedIn
                </OAuthButton>
              )}
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-500">
                or {tab === "signin" ? "sign in" : "sign up"} with email
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4" data-testid="email-auth-form">
              {tab === "signup" && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1.5">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className={inputClass}
                    data-testid="signup-name"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  data-testid="login-email"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className={`${inputClass} pr-11`}
                    data-testid="login-password"
                    autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-700"
                    data-testid="toggle-password"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {tab === "signin" && (
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={handleForgot}
                      className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium"
                      data-testid="forgot-password"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {tab === "signin" && (
                <label
                  className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer"
                  data-testid="keep-signed-in-label"
                >
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                    data-testid="keep-signed-in"
                  />
                  Keep me signed in for 30 days
                </label>
              )}

              {tab === "signup" && (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  By creating a candidate account, you agree that SaturnMax Technologies may use your submitted profile, resume, application, and contact details for hiring, consulting, and communication purposes.
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0A192F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0e2445] transition-colors disabled:opacity-60"
                data-testid={tab === "signin" ? "signin-submit" : "signup-submit"}
              >
                {busy
                  ? tab === "signin"
                    ? "Signing in..."
                    : "Creating account..."
                  : tab === "signin"
                  ? "Sign in to SaturnMax"
                  : "Create account"}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-600">
              {tab === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setTab("signup")}
                    className="text-[#2563EB] font-semibold hover:text-[#1D4ED8]"
                    data-testid="switch-to-signup"
                  >
                    Create one free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setTab("signin")}
                    className="text-[#2563EB] font-semibold hover:text-[#1D4ED8]"
                    data-testid="switch-to-signin"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>

          {!isFirebaseConfigured && (
            <div
              className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900 flex items-start gap-3"
              data-testid="firebase-status-banner"
            >
              <div>
                <div className="font-semibold">Sign-in service unavailable</div>
                <div className="text-xs mt-0.5">
                  Please contact{" "}
                  <a href="mailto:hello@saturnmax.com" className="font-semibold underline">
                    hello@saturnmax.com
                  </a>{" "}
                  for immediate access support.
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PortalLink
              to="/consultant-login"
              Icon={BriefcaseBusiness}
              title="Consultant Login"
              body="Project, pay, tax, onboarding, and documents."
            />
            <PortalLink
              to="/employee-login"
              Icon={UserCog}
              title="Employee/Admin Login"
              body="Candidates, consultants, client projects, and records."
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/* --- local ui bits --- */
const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function OAuthButton({ onClick, children, dataTestId, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={dataTestId}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.62v3h3.86c2.26-2.08 3.56-5.14 3.56-8.86Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.87l-3.86-3c-1.07.72-2.44 1.16-4.07 1.16-3.12 0-5.76-2.11-6.7-4.94H1.3v3.1A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.35a7.2 7.2 0 0 1 0-4.7V6.55H1.3a12 12 0 0 0 0 10.9l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.3 6.55l4 3.1C6.24 6.86 8.88 4.75 12 4.75Z" />
    </svg>
  );
}

function LinkedInGlyph() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#0A66C2] text-white text-[10px] font-bold">
      in
    </span>
  );
}

function PortalLink({ to, Icon, title, body }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#2563EB]/40 hover:shadow-sm transition-all"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#2563EB]/10 text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{body}</p>
    </Link>
  );
}
