import React from "react";
import { MessageSquare } from "lucide-react";

const PREVIEW = [
  {
    id: "m1",
    from: "HR team — Saturn Max",
    subject: "Interview prep for Senior Full Stack Dev",
    preview:
      "Hi Rahul — we've scheduled your interview for Monday 10am IST. Please confirm your availability…",
    time: "Today, 9:42 am",
    unread: true,
  },
  {
    id: "m2",
    from: "Priya (Recruiter)",
    subject: "Introduction call",
    preview:
      "Loved your portfolio! Would you be open to a quick 15-min call this week?",
    time: "Yesterday, 3:15 pm",
    unread: true,
  },
  {
    id: "m3",
    from: "Saturn Max Careers",
    subject: "Your AI/ML Engineer application",
    preview:
      "Thanks for applying to AI/ML Engineer. We've received your application and the hiring team is reviewing it…",
    time: "2 days ago",
    unread: true,
  },
];

export default function Messages() {
  return (
    <div className="space-y-5" data-testid="messages-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          Messages
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Conversations with the Saturn Max hiring team.
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
        {PREVIEW.map((m) => (
          <div
            key={m.id}
            className="flex gap-4 px-6 py-5 hover:bg-slate-50/60 cursor-pointer"
            data-testid={`message-${m.id}`}
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-[#0A192F] text-white grid place-items-center">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {m.unread && (
                  <span className="h-2 w-2 rounded-full bg-[#2563EB] shrink-0" />
                )}
                <div className="font-semibold text-sm text-slate-900 truncate">
                  {m.from}
                </div>
                <span className="ml-auto text-xs text-slate-400 shrink-0">
                  {m.time}
                </span>
              </div>
              <div className="mt-0.5 text-sm font-medium text-slate-800 truncate">
                {m.subject}
              </div>
              <div className="mt-1 text-sm text-slate-500 truncate">{m.preview}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
        Messaging is a preview — we'll light up real chat once Firebase auth +
        Firestore messages are wired.
      </div>
    </div>
  );
}
