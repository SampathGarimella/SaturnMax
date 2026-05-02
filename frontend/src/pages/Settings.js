import React, { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const [emailPrefs, setEmailPrefs] = useState({
    applicationUpdates: true,
    newRoles: true,
    recruiterMessages: true,
    weeklyDigest: false,
  });
  const [theme, setTheme] = useState("light");

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
                onChange={(e) =>
                  setEmailPrefs({ ...emailPrefs, [row.id]: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
              />
            </label>
          ))}
        </div>
        <button
          onClick={() => toast.success("Email preferences saved.")}
          className="mt-5 inline-flex items-center rounded-md bg-[#0A192F] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0e2445]"
          data-testid="save-email-prefs"
        >
          Save preferences
        </button>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
        <div className="font-heading text-lg font-semibold text-slate-900">
          Appearance
        </div>
        <div className="mt-4 flex gap-2">
          {["light", "system"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTheme(t);
                toast.success(`Theme set to ${t}.`);
              }}
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
              onClick={() => toast.info("Password reset support is available via account services.")}
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
              onClick={() =>
                toast.error("Account deletion requires email confirmation (coming soon).")
              }
              className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              data-testid="delete-account"
            >
              Delete
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
