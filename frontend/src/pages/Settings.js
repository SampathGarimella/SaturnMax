import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { fetchUserPreferences, requestCandidateAccountClosure, saveUserPreferences } from "../lib/api";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_UI_PREFERENCES,
} from "../lib/validators";

export default function Settings() {
  const { user, sendReset } = useAuth();
  const [emailPrefs, setEmailPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [theme, setTheme] = useState(DEFAULT_UI_PREFERENCES.theme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [closureRequested, setClosureRequested] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!user?.uid) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    fetchUserPreferences(user.uid)
      .then((prefs) => {
        if (ignore) return;
        setEmailPrefs(prefs.notificationPreferences);
        setTheme(prefs.uiPreferences.theme);
      })
      .catch((err) => {
        console.error(err);
        toast.error(err?.message || "Could not load settings.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [user?.uid]);

  const savePreferences = async (next = {}) => {
    const previousEmailPrefs = emailPrefs;
    const previousTheme = theme;
    const nextEmailPrefs = next.notificationPreferences || emailPrefs;
    const nextTheme = next.uiPreferences?.theme || theme;
    setEmailPrefs(nextEmailPrefs);
    setTheme(nextTheme);
    if (next.kind === "theme") {
      const dashboardTheme = nextTheme === "system"
        ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : nextTheme;
      document.documentElement.dataset.dashboardTheme = dashboardTheme;
      window.localStorage.setItem("saturnmax-dashboard-theme", dashboardTheme);
    }
    setSaving(next.kind || "settings");
    try {
      const saved = await saveUserPreferences({
        notificationPreferences: nextEmailPrefs,
        uiPreferences: { theme: nextTheme },
      });
      setEmailPrefs(saved.notificationPreferences);
      setTheme(saved.uiPreferences.theme);
      toast.success(next.kind === "theme" ? "Appearance saved." : "Preferences saved.");
    } catch (err) {
      console.error(err);
      setEmailPrefs(previousEmailPrefs);
      setTheme(previousTheme);
      toast.error(err?.message || "Could not save settings.");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Preferences, notifications, and account actions.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
        <div className="font-heading text-lg font-semibold text-slate-900">
          Email notifications
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Pick which updates land in your inbox.
        </p>
        <div className="mt-5 divide-y divide-slate-100">
          {[
            { id: "applicationUpdates", label: "Application status updates" },
            { id: "newRoles", label: "New roles matching my preferences" },
            { id: "recruiterMessages", label: "Recruiter direct messages" },
            { id: "documentRequests", label: "Document requests and review outcomes" },
            { id: "interviewChanges", label: "Interview schedule changes" },
            { id: "weeklyDigest", label: "Weekly digest of activity" },
          ].map((row) => (
            <label
              key={row.id}
              className="flex items-center justify-between py-3 cursor-pointer"
              data-testid={`toggle-${row.id}`}
            >
              <span className="text-sm text-slate-800">{row.label}</span>
              <input
                type="checkbox"
                checked={emailPrefs[row.id]}
                disabled={loading || saving === "email"}
                onChange={(e) =>
                  setEmailPrefs({ ...emailPrefs, [row.id]: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
            </label>
          ))}
        </div>
        <button
          onClick={() =>
            savePreferences({ kind: "email", notificationPreferences: emailPrefs })
          }
          disabled={loading || saving === "email"}
          className="mt-5 inline-flex items-center rounded-md bg-[#0A192F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0e2445]"
          data-testid="save-email-prefs"
        >
          {saving === "email" ? "Saving..." : "Save preferences"}
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
        <div className="font-heading text-lg font-semibold text-slate-900">
          Appearance
        </div>
        <div className="mt-4 flex gap-2">
          {["light", "dark", "system"].map((t) => (
            <button
              key={t}
              onClick={() => {
                savePreferences({ kind: "theme", uiPreferences: { theme: t } });
              }}
              disabled={loading || saving === "theme"}
              data-testid={`theme-${t}`}
              className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${
                theme === t
                  ? "bg-[#2563EB] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          System mode follows your device preference.
        </p>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
        <div className="font-heading text-lg font-semibold text-slate-900">
          Account
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-900 font-medium">Change password</div>
              <div className="text-slate-500 text-xs">
                We'll send a secure reset link to your registered email.
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await sendReset(user.email);
                  toast.success(`Password reset link sent to ${user.email}.`);
                } catch (err) {
                  toast.error(err?.message || "Could not send password reset.");
                }
              }}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              data-testid="change-password"
            >
              Request reset
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-rose-600 font-medium">Delete account</div>
              <div className="text-slate-500 text-xs">
                Permanently remove your profile, applications, and messages.
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await requestCandidateAccountClosure();
                  setClosureRequested(true);
                  toast.success("Account closure request sent for review.");
                } catch (err) {
                  toast.error(err?.message || "Could not request account closure.");
                }
              }}
              disabled={closureRequested}
              className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              data-testid="delete-account"
            >
              {closureRequested ? "Requested" : "Request closure"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
