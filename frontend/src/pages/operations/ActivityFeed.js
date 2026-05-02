import React from "react";
import { Activity } from "lucide-react";
import { StatusBadge } from "../../components/ui";
import { humanDate } from "./operationsUtils";

export default function ActivityFeed({ logs = [] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
        <h2 className="font-heading text-lg font-semibold text-slate-900">Activity feed</h2>
      </div>
      <div className="mt-4 space-y-3">
        {logs.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Status moves, review decisions, and activation attempts will appear here.
          </div>
        )}
        {logs.slice(0, 12).map((log) => (
          <div key={log.id} className="rounded-lg border border-slate-200 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{String(log.action || "activity").replace(/_/g, " ")}</span>
              <StatusBadge value={log.outcome || "success"} withIcon={false} />
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {log.actorEmail || log.actorUid || "Operator"} / {log.targetCollection || "record"}:{log.targetId || ""} / {humanDate(log.createdAt || log.created_at)}
            </div>
            {log.reason && <div className="mt-2 text-xs text-rose-700">{log.reason}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
