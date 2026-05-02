import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import {
  ActionBar,
  EmptyState,
  LoadingState,
  SearchInput,
  SectionHeader,
} from "../../components/ui";
import { fetchMessageThread, markEmployeeThreadRead, sendHiringMessage } from "../../lib/api";
import { useOperations } from "./OperationsContext";
import { humanDate } from "./operationsUtils";

const PRESETS = [
  { id: "all", label: "All threads" },
  { id: "unread", label: "Unread" },
  { id: "recent", label: "Recently active" },
];

export default function OperationsMessages() {
  const { data, busy, setBusy, load, showMutationError } = useOperations();
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState("all");
  const [activeThreadUid, setActiveThreadUid] = useState("");
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyText, setReplyText] = useState("");

  const threads = useMemo(() => {
    return data.messageThreads
      .filter((thread) => (preset === "unread" ? thread.unreadCount > 0 : true))
      .filter((thread) =>
        [thread.candidateName, thread.candidateEmail, thread.candidateUid, thread.latestText]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())
      );
  }, [data.messageThreads, preset, query]);

  useEffect(() => {
    if (!activeThreadUid && threads.length > 0) {
      setActiveThreadUid(threads[0].candidateUid);
    }
  }, [activeThreadUid, threads]);

  useEffect(() => {
    if (!activeThreadUid) {
      setThreadMessages([]);
      return undefined;
    }
    let ignore = false;
    setThreadLoading(true);
    fetchMessageThread(activeThreadUid)
      .then(async (messages) => {
        if (!ignore) setThreadMessages(messages);
        if (messages.some((message) => message.unreadForEmployee)) {
          await markEmployeeThreadRead(activeThreadUid);
          if (!ignore) setThreadMessages(await fetchMessageThread(activeThreadUid));
          load();
        }
      })
      .catch((err) => {
        showMutationError(err, "Could not load message thread.");
      })
      .finally(() => {
        if (!ignore) setThreadLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [activeThreadUid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReply = async (event) => {
    event.preventDefault();
    setBusy("message-reply");
    try {
      await sendHiringMessage({
        candidateUid: activeThreadUid,
        text: replyText,
        employee: { name: "Hiring team" },
      });
      setReplyText("");
      setThreadMessages(await fetchMessageThread(activeThreadUid));
      await load();
      toast.success("Reply sent to candidate portal.");
    } catch (err) {
      showMutationError(err, "Could not send reply.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5" data-testid="operations-messages-page">
      <SectionHeader
        eyebrow="Messages"
        title="Candidate conversations"
        description="Unread counters clear when a thread opens, and replies write back to the candidate portal."
      />

      <ActionBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search candidates or message text" />
        <div className="flex gap-2 overflow-x-auto">
          {PRESETS.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setPreset(view.id)}
              className={`h-10 shrink-0 rounded-md px-3 text-xs font-semibold ${
                preset === view.id ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </ActionBar>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="max-h-[70vh] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
          {threads.length === 0 && (
            <EmptyState title="No candidate messages" body="Candidate messages will appear here after they start a hiring conversation." Icon={MessageSquare} />
          )}
          {threads.map((thread) => (
            <button
              key={thread.candidateUid}
              type="button"
              onClick={() => setActiveThreadUid(thread.candidateUid)}
              className={`w-full rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${
                activeThreadUid === thread.candidateUid
                  ? "border-[#2563EB] bg-blue-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{thread.candidateName}</div>
                  <div className="truncate text-xs text-slate-500">{thread.candidateEmail || thread.candidateUid}</div>
                </div>
                {thread.unreadCount > 0 && (
                  <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
              <div className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">{thread.latestText || "No message text"}</div>
              <div className="mt-2 text-[11px] text-slate-400">{thread.latestAtLabel}</div>
            </button>
          ))}
        </div>

        <div className="flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              {activeThreadUid
                ? threads.find((thread) => thread.candidateUid === activeThreadUid)?.candidateName || "Candidate"
                : "Choose a thread"}
            </div>
            <div className="text-xs text-slate-500">{activeThreadUid || "Messages are stored under messages/{candidateUid}/thread"}</div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
            {threadLoading && <LoadingState label="Loading messages..." />}
            {!threadLoading && activeThreadUid && threadMessages.length === 0 && (
              <EmptyState title="No messages in this thread" body="Reply once the candidate sends a message or choose a different thread." />
            )}
            {!activeThreadUid && <EmptyState title="Select a candidate thread" body="Choose a conversation from the left to reply." />}
            {threadMessages.map((message) => {
              const fromCandidate = message.author === "candidate";
              return (
                <div key={message.id} className={`flex ${fromCandidate ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[88%] rounded-xl px-4 py-3 text-sm shadow-sm ${fromCandidate ? "bg-white text-slate-800" : "bg-[#0A192F] text-white"}`}>
                    <div className={`text-[11px] font-semibold ${fromCandidate ? "text-slate-500" : "text-white/70"}`}>
                      {fromCandidate ? message.authorName || "Candidate" : message.authorName || "Hiring team"}
                    </div>
                    <div className="mt-1 whitespace-pre-wrap leading-relaxed">{message.text}</div>
                    <div className={`mt-2 text-[10px] ${fromCandidate ? "text-slate-400" : "text-white/55"}`}>
                      {message.time || humanDate(message.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={handleReply} className="flex flex-col gap-3 border-t border-slate-100 p-3 sm:flex-row">
            <input
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              disabled={!activeThreadUid}
              className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              placeholder={activeThreadUid ? "Reply to candidate" : "Choose a thread first"}
            />
            <button disabled={!activeThreadUid || !replyText.trim() || busy === "message-reply"} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
              <Send className="h-4 w-4" aria-hidden="true" />
              Send
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
