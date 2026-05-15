import React from "react";
import { Link } from "react-router-dom";

export default function Logo({ compact = false, className = "" }) {
  const goHomeTop = () => {
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }, 0);
  };

  return (
    <Link
      to="/"
      onClick={goHomeTop}
      className={`flex items-center gap-3 group ${className}`}
      data-testid="brand-logo-link"
    >
      <img
        src="/favicon.png"
        alt="SaturnMax Technologies"
        className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-lg object-contain shadow-sm transition-transform group-hover:-rotate-3"
      />
      {!compact && (
        <div className="hidden sm:block min-w-0 leading-tight">
          <div className="font-heading font-semibold text-[14px] md:text-[15px] text-slate-900 truncate">
            SaturnMax Technologies
          </div>
        </div>
      )}
    </Link>
  );
}
