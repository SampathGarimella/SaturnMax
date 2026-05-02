import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  ChevronDown,
  LogIn,
  UserCog,
  UserRound,
} from "lucide-react";

const LOGIN_OPTIONS = [
  {
    to: "/login",
    label: "Candidate login",
    body: "Apply, upload resume, track interviews",
    Icon: UserRound,
  },
  {
    to: "/consultant-login",
    label: "Consultant login",
    Icon: BriefcaseBusiness,
  },
  {
    to: "/employee-login",
    label: "Employee login",
    Icon: UserCog,
  },
];

export default function LoginMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 sm:px-4 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:border-[#2563EB]/40 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="top-login-menu-button"
      >
        <LogIn className="h-4 w-4 text-[#2563EB]" />
        <span>Login</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute right-0 top-full z-50 pt-2 transition ${
          open ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
        }`}
      >
        <div className="w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] font-bold text-[#2563EB]">
              Choose portal
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              SaturnMax Technologies Pvt Ltd
            </div>
          </div>
          <div className="p-2">
            {LOGIN_OPTIONS.map(({ to, label, body, Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                role="menuitem"
                onClick={() => setOpen(false)}
                data-testid={`login-menu-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#2563EB]/10 text-[#2563EB]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  {body && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{body}</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
