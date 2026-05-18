import React from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  Briefcase,
  CalendarCheck,
  Eye,
  UserCircle2,
  Check,
  CircleDot,
  Building2,
  FileText,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { getApplicationStatusMeta } from "../lib/workflow";
import { BRAND_NAME } from "../lib/brand";

const DOT_COLORS = {
  slate: "bg-slate-500",
  green: "bg-emerald-500",
  blue: "bg-[#2563EB]",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  red: "bg-rose-500",
};

const SUPPORT_CENTER = [
  {
    Icon: Building2,
    title: "Interview coordination",
    value: "Scheduling support",
    body: "Track interviews, confirmations, and follow-ups in one place.",
  },
  {
    Icon: MessageSquare,
    title: "Hiring messages",
    value: "Direct recruiter updates",
    body: "Stay in touch with recruiters and get timely status updates.",
  },
  {
    Icon: FileText,
    title: "Documents",
    value: "Profile and resume",
    body: "Keep your documents updated for faster shortlisting.",
  },
];

const CAREER_ACTIONS = [
  "Complete your portfolio and resume details",
  "Apply to roles matching your strongest skills",
  "Respond to recruiter messages within 24 hours",
  "Keep notice period and CTC details updated",
];

export default function DashboardHome() {
  const { data, loading } = useOutletContext();

  if (loading || !data) {
    return <div className="text-sm text-slate-500">Loading dashboard...</div>;
  }

  const { candidate, stats, applications, activity } = data;
  const latestApplication = applications[0];
  const latestMeta = latestApplication ? getApplicationStatusMeta(latestApplication.status) : null;

  return (
    <div className="space-y-6" data-testid="dashboard-home">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        {!candidate.emailVerified && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Verify your email from the link {BRAND_NAME} sent after signup. Verified email helps the hiring team contact you reliably.
          </div>
        )}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2563EB]">
              Candidate journey
            </div>
            <h2 className="mt-1 font-heading text-xl font-semibold text-slate-900">
              Profile readiness, applications, status tracking, and messaging in one flow.
            </h2>
            {latestMeta && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Current next action: {latestMeta.nextAction}
              </p>
            )}
          </div>
          <Link
            to="/dashboard/jobs"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Continue journey
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <JourneyStep
            n="01"
            title="Profile readiness"
            body={`${stats.profile_complete_percent}% complete`}
            done={stats.profile_complete_percent >= 80}
            to="/dashboard/profile"
          />
          <JourneyStep
            n="02"
            title="Apply"
            body={`${stats.applications_sent} submitted`}
            done={stats.applications_sent > 0}
            to="/dashboard/jobs"
          />
          <JourneyStep
            n="03"
            title="Track status"
            body={latestApplication ? latestMeta.label : "No active application"}
            done={Boolean(latestApplication)}
            to="/dashboard/applications"
          />
          <JourneyStep
            n="04"
            title="Messaging"
            body="Hiring team updates"
            done={false}
            to="/dashboard/messages"
          />
        </div>
      </section>

      {/* stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          Icon={Briefcase}
          label="Applications sent"
          value={stats.applications_sent}
          meta={
            <span className="text-emerald-600 text-xs font-medium">
              +{stats.applications_delta_week} this week
            </span>
          }
          testId="stat-applications"
        />
        <StatCard
          Icon={CalendarCheck}
          label="Interviews scheduled"
          value={stats.interviews_scheduled}
          meta={
            stats.next_interview ? (
              <span className="text-[#2563EB] text-xs font-medium">
                Next: {stats.next_interview}
              </span>
            ) : (
              <span className="text-slate-400 text-xs">None scheduled</span>
            )
          }
          testId="stat-interviews"
        />
        <StatCard
          Icon={Eye}
          label="Profile views"
          value={stats.profile_views}
          meta={
            <span className="text-emerald-600 text-xs font-medium">
              +{stats.profile_views_delta_week} this week
            </span>
          }
          testId="stat-profile-views"
        />
        <StatCard
          Icon={UserCircle2}
          label="Profile complete"
          value={`${stats.profile_complete_percent}%`}
          meta={
            <span className="text-amber-600 text-xs font-medium">Add portfolio</span>
          }
          testId="stat-profile-complete"
          highlight
        />
      </div>

      {/* applications + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* my applications */}
        <section
          className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7"
          data-testid="my-applications-card"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-lg font-semibold text-slate-900">
              My applications
            </h2>
            <Link
              to="/dashboard/applications"
              className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              data-testid="view-all-applications"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {applications.length === 0 && (
              <li className="text-sm text-slate-500 py-6">
                You haven't applied to any roles yet.{" "}
                <Link to="/dashboard/jobs" className="text-[#2563EB] hover:text-[#1D4ED8] font-medium">
                  Browse jobs →
                </Link>
              </li>
            )}
            {applications.slice(0, 4).map((a) => {
              const meta = getApplicationStatusMeta(a.status);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  data-testid={`application-row-${a.id}`}
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {a.position_title}
                    </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Applied {a.applied_ago || "recently"}
                  </div>
                  <div className="mt-1 max-w-md text-xs text-slate-500">
                    {meta.nextAction}
                  </div>
                </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* recent activity */}
        <section
          className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7"
          data-testid="recent-activity-card"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-lg font-semibold text-slate-900">
              Recent activity
            </h2>
          </div>
          <ul className="space-y-4">
            {activity.length === 0 && (
              <li className="text-sm text-slate-500">No activity yet.</li>
            )}
            {activity.slice(0, 6).map((ev) => (
              <li key={ev.id} className="flex gap-3" data-testid={`activity-${ev.id}`}>
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    DOT_COLORS[ev.color] || DOT_COLORS.blue
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm text-slate-900 leading-snug">{ev.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{ev.timestamp_label}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* profile completion */}
      <section
        className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7"
        data-testid="profile-completion-card"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-lg font-semibold text-slate-900">
            Complete your profile
          </h2>
          <Link
            to="/dashboard/profile"
            className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
            data-testid="go-to-profile"
          >
            Go to profile
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ChecklistItem
            label="Basic info"
            done={candidate.profile_checklist.basic_info}
            testId="checklist-basic"
          />
          <ChecklistItem
            label="Work preference"
            done={candidate.profile_checklist.work_preference}
            testId="checklist-work-preference"
          />
          <ChecklistItem
            label="Portfolio URL"
            done={candidate.profile_checklist.portfolio_url}
            testId="checklist-portfolio"
          />
          <ChecklistItem
            label="Upload resume"
            done={candidate.profile_checklist.resume_uploaded}
            testId="checklist-resume"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <div
          className="bg-white border border-slate-200 rounded-2xl p-6 md:p-7"
          data-testid="client-workspace-card"
        >
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-heading text-lg font-semibold text-slate-900">
                Career support
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Everything you need to keep your hiring journey moving smoothly.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Active
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUPPORT_CENTER.map((item) => (
              <WorkspaceItem key={item.title} {...item} />
            ))}
          </div>
        </div>

        <div
          className="bg-[#0A192F] text-white rounded-2xl p-6 md:p-7"
          data-testid="admin-queue-card"
        >
          <h2 className="font-heading text-lg font-semibold">Your next actions</h2>
          <p className="mt-1 text-sm text-white/65">
            These steps improve response speed and interview conversion.
          </p>
          <ul className="mt-5 space-y-3">
            {CAREER_ACTIONS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function JourneyStep({ n, title, body, done, to }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{n}</span>
        {done ? <Check className="h-4 w-4 text-emerald-600" /> : <CircleDot className="h-4 w-4 text-amber-500" />}
      </div>
      <div className="mt-3 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{body}</div>
    </Link>
  );
}

function StatCard({ Icon, label, value, meta, testId, highlight }) {
  return (
    <div
      className={`rounded-2xl border ${
        highlight ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"
      } p-5 md:p-6 hover:shadow-sm transition-shadow`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
          {label}
        </span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/60 border border-slate-200 text-slate-500">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 font-heading text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-1.5">{meta}</div>
    </div>
  );
}

function ChecklistItem({ label, done, testId }) {
  return (
    <div
      data-testid={testId}
      className={`rounded-xl px-4 py-3.5 text-sm font-medium flex items-center gap-2.5 ${
        done
          ? "bg-emerald-50 text-emerald-900"
          : "bg-amber-50 text-amber-900"
      }`}
    >
      {done ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <CircleDot className="h-4 w-4 text-amber-600" />
      )}
      {label}
    </div>
  );
}

function WorkspaceItem({ Icon, title, value, body }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white border border-slate-200 text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs font-semibold text-[#2563EB]">{value}</div>
      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
