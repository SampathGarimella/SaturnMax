import React from "react";
import { Link } from "react-router-dom";

export default function Logo({ compact = false, to = "/", className = "" }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 group ${className}`}
      data-testid="brand-logo-link"
    >
      <div className="relative h-11 w-11 rounded-lg bg-[#0A192F] text-white grid place-items-center shadow-sm transition-transform group-hover:-rotate-3">
        <span className="font-heading font-bold text-sm tracking-wide">SM</span>
        <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#2563EB] ring-2 ring-white" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-heading font-semibold text-[15px] text-slate-900">
            Saturn Max Technologies
          </div>
          <div className="text-[11px] text-slate-500 tracking-wide">
            Pvt Ltd · India
          </div>
        </div>
      )}
    </Link>
  );
}
