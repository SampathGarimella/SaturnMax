import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

const PLACEHOLDER_PREVIEW = [
  {
    id: "m1",
    author: "hr",
    authorName: "HR team — Saturn Max",
    text: "Hi Rahul — we've scheduled your interview for Monday 10am IST. Please confirm your availability 🙏",
    time: "Today, 9:42 am",
    unread: true,
  },
  {
    id: "m2",
    author: "hr",
    authorName: "Priya (Recruiter)",
    text: "Loved your portfolio! Would you be open to a quick 15-min call this week?",
    time: "Yesterday, 3:15 pm",
    unread: true,
  },
  {
    id: "m3",
    author: "hr",
    authorName: "Saturn Max Careers",
    text: "Thanks for applying to AI/ML Engineer. We've received your application and the hiring team is reviewing it — we'll be in touch within 3 business days.",
    time: "2 days ago",
    unread: true,
  },
];

export default function Messages() {
  const { user, mode } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [liveLoading, setLiveLoading] = useState(true);
  const scrollerRef = useRef(null);

  const live = isFirebaseConfigured && mode === "firebase" && user?.uid;

  // Live Firestore subscription
  useEffect(() => {
    if (!live) {
      setMessages(PLACEHOLDER_PREVIEW);
      setLiveLoading(false);
      return undefined;
    }
    setLiveLoading(true);
    const q = query(
      collection(db, "messages", user.uid, "thread"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          time: d.data().createdAt?.toDate?.().toLocaleString?.() || "just now",
        }));
        setMessages(out);
        setLiveLoading(false);
      },
      (err) => {
        console.error("Firestore subscribe failed:", err);
        toast.error(
          err.code === "permission-denied"
            ? "Firestore rules blocked this query. Paste the rules from FIREBASE_SETUP.md."
            : "Couldn't connect to real-time messages."
        );
        setLiveLoading(false);
      }
    );
    return () => unsub();
  }, [live, user?.uid]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (!live) {
      toast.info(
        "Real-time messaging needs Firebase configured + signed-in auth. You're in demo mode — see FIREBASE_SETUP.md."
      );
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "messages", user.uid, "thread"), {
        author: "candidate",
        authorName: user.name || user.email,
        text,
        createdAt: serverTimestamp(),
      });
      setInput("");
    } catch (err) {
      console.error(err);
      toast.error(
        err.code === "permission-denied"
          ? "Firestore rules blocked this write. Paste the rules from FIREBASE_SETUP.md."
          : "Couldn't send. Try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="messages-page">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">
          Messages
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Conversations with the Saturn Max hiring team.{" "}
          {live ? (
            <span className="text-emerald-600 font-medium">Live · Firestore</span>
          ) : (
            <span className="text-amber-600 font-medium">Preview mode</span>
          )}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[560px]">
        <div
          ref={scrollerRef}
          className="flex-1 overflow-y-auto divide-y divide-slate-100"
          data-testid="messages-scroll"
        >
          {liveLoading && (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {!liveLoading && messages.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              No messages yet. Say hi to the HR team 👋
            </div>
          )}
          {messages.map((m) => {
            const mine = m.author === "candidate";
            return (
              <div
                key={m.id}
                className={`flex gap-4 px-6 py-5 ${
                  mine ? "bg-blue-50/30" : "hover:bg-slate-50/60"
                }`}
                data-testid={`message-${m.id}`}
              >
                <div
                  className={`h-10 w-10 shrink-0 rounded-full grid place-items-center text-white text-sm font-semibold ${
                    mine ? "bg-[#2563EB]" : "bg-[#0A192F]"
                  }`}
                >
                  {mine ? (
                    (user?.name || "Y").slice(0, 1).toUpperCase()
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {m.unread && !mine && (
                      <span className="h-2 w-2 rounded-full bg-[#2563EB] shrink-0" />
                    )}
                    <div className="font-semibold text-sm text-slate-900 truncate">
                      {mine ? "You" : m.authorName || "Saturn Max"}
                    </div>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">
                      {m.time}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-slate-200 p-3 flex items-center gap-2 bg-white"
          data-testid="message-composer"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              live
                ? "Type a message…"
                : "Preview mode — configure Firebase to send live messages"
            }
            className="flex-1 h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            data-testid="message-input"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
            data-testid="message-send"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>

      {!live && (
        <div className="flex gap-2 items-start rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            You're viewing seeded preview messages. To enable real-time messaging via Firestore:
            sign in with Firebase Auth on <code>/login</code>, or paste your Firebase config into{" "}
            <code>/app/frontend/.env</code>. Full walkthrough in <code>FIREBASE_SETUP.md</code>.
          </div>
        </div>
      )}
    </div>
  );
}
