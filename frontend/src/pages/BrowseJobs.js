import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Briefcase } from "lucide-react";
import { fetchJobs } from "../lib/api";

const TAG_STYLES = {
  "Full-time": "bg-slate-100 text-slate-700",
  Remote: "bg-emerald-50 text-emerald-700",
  "Remote USA": "bg-emerald-50 text-emerald-700",
  Hybrid: "bg-sky-50 text-sky-700",
  Contract: "bg-violet-50 text-violet-700",
  Freelance: "bg-violet-50 text-violet-700",
  "Hot role": "bg-amber-50 text-amber-700",
  Urgent: "bg-rose-50 text-rose-700",
  "15% commission": "bg-amber-50 text-amber-700",
  "US project": "bg-blue-50 text-blue-700",
};

function tagClass(tag) {
  if (TAG_STYLES[tag]) return TAG_STYLES[tag];
  return "bg-slate-50 text-slate-600";
}

export default function BrowseJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs()
      .then(setJobs)
      .catch(() => toast.error("Couldn't load jobs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5" data-testid="browse-jobs-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          Browse jobs
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Open positions curated for you by SaturnMax Technologies Pvt Ltd.
        </p>
      </div>
      {loading ? (
        <div className="text-sm text-slate-500">Loading roles…</div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          No open roles are published right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#2563EB]/30 hover:shadow-md transition-all flex flex-col"
              data-testid={`browse-job-${job.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#2563EB] font-semibold">
                    <Briefcase className="h-3 w-3" />
                    {job.department}
                  </div>
                  <h3 className="mt-2 font-heading text-lg font-semibold text-slate-900">
                    {job.title}
                  </h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {job.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {job.tags.map((t) => (
                  <span
                    key={t}
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tagClass(t)}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`/#apply-section`}
                  className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1"
                  data-testid={`browse-job-apply-${job.id}`}
                >
                  Apply now
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <span className="text-xs text-slate-400">{job.employment_type}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
