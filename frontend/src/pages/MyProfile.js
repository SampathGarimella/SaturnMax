import React from "react";
import { useOutletContext } from "react-router-dom";
import { Mail, Phone, Link2, FileUp } from "lucide-react";

export default function MyProfile() {
  const { data, loading } = useOutletContext();

  if (loading || !data)
    return <div className="text-sm text-slate-500">Loading profile…</div>;

  const { candidate, stats } = data;

  return (
    <div className="space-y-6" data-testid="my-profile-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          My profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Keep your profile up to date — recruiters view this when considering you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-5">
            <div className="avatar-ring">
              <div className="h-16 w-16 rounded-full bg-[#2563EB] text-white grid place-items-center text-lg font-semibold">
                {(candidate.name.split(" ").map((p) => p[0]).slice(0, 2).join("")).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="font-heading text-xl font-semibold text-slate-900">
                {candidate.name}
              </div>
              <div className="text-sm text-slate-500">{candidate.role_label}</div>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow Icon={Mail} label="Email" value={candidate.email} />
            <InfoRow Icon={Phone} label="Phone" value={candidate.phone || "—"} />
            <InfoRow
              Icon={Link2}
              label="Portfolio"
              value={candidate.portfolio_url || "Add your LinkedIn / portfolio"}
            />
            <InfoRow
              Icon={FileUp}
              label="Resume"
              value={candidate.resume_uploaded ? "Uploaded" : "Not uploaded"}
            />
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="text-sm font-semibold text-slate-900">
            Profile strength
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div className="font-heading text-5xl font-bold text-slate-900">
              {stats.profile_complete_percent}%
            </div>
            <div className="text-xs text-amber-600 font-medium mb-1.5">
              Complete more to stand out
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#2563EB] transition-all"
              style={{ width: `${stats.profile_complete_percent}%` }}
            />
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            <li className="text-slate-600">
              Add your portfolio URL — recruiters click it first.
            </li>
            <li className="text-slate-600">
              Upload a resume so HR can share with hiring managers instantly.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2563EB]/10 text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm text-slate-900 break-words">{value}</div>
      </div>
    </div>
  );
}
