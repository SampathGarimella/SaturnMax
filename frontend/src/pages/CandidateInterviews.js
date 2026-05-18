import React from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, ExternalLink } from "lucide-react";
import { EmptyState, SectionHeader, StatusBadge } from "../components/ui";
import { BRAND_NAME } from "../lib/brand";

export default function CandidateInterviews() {
  const { data, loading } = useOutletContext();

  if (loading || !data) return <div className="text-sm text-slate-500">Loading interviews...</div>;

  const interviews = (data.applications || [])
    .filter((application) => application.interview_date || application.interviewTime || application.meeting_link || application.interviewStatus)
    .map((application) => ({
      id: application.id,
      positionTitle: application.position_title || "Application",
      status: application.interviewStatus || (application.status === "interview" ? "scheduled" : "not scheduled"),
      startsAt: application.interview_date || application.interviewTime || "",
      interviewer: application.interviewer || `${BRAND_NAME} hiring team`,
      meetingLink: application.meeting_link || "",
      nextAction: application.status_next_action || "Watch this page for interview updates.",
    }));

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Interviews"
        title="Interview schedule"
        description="View scheduled interview details, meeting links, and next steps shared by the hiring team."
      />

      {interviews.length === 0 ? (
        <EmptyState
          title="No interviews scheduled"
          body="When the hiring team schedules an interview, the date, interviewer, and meeting link will appear here."
          Icon={CalendarDays}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {interviews.map((interview) => (
            <article key={interview.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-slate-900">{interview.positionTitle}</h2>
                  <div className="mt-1 text-sm text-slate-500">
                    {interview.startsAt || "Date and time to be confirmed"}
                  </div>
                </div>
                <StatusBadge value={interview.status} withIcon={false} />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Interviewer</div>
                  <div className="mt-1 font-semibold text-slate-900">{interview.interviewer}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Meeting</div>
                  {interview.meetingLink ? (
                    <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
                      Open meeting link
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <div className="mt-1 font-semibold text-slate-900">To be shared</div>
                  )}
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm leading-relaxed text-blue-950">
                {interview.nextAction}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
