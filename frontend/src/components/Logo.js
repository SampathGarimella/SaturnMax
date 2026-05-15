import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Logo({ compact = false, className = "" }) {
  const navigate = useNavigate();

  const scrollHomeTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const goHomeTop = (event) => {
    event.preventDefault();
    navigate("/");
    window.requestAnimationFrame(() => {
      scrollHomeTop();
      window.requestAnimationFrame(scrollHomeTop);
    });
  };

  return (
    <Link
      to="/"
      onClick={goHomeTop}
      className={`flex min-w-0 items-center gap-2 sm:gap-3 group ${className}`}
      data-testid="brand-logo-link"
    >
      <img
        src="/favicon.png"
        alt="SaturnMax Technologies"
        className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-lg object-contain shadow-sm transition-transform group-hover:-rotate-3"
      />
      {!compact && (
        <div className="block min-w-0 leading-tight">
          <div className="max-w-[9.5rem] truncate font-heading text-[12px] font-semibold text-slate-900 sm:max-w-none sm:text-[14px] md:text-[15px]">
            SaturnMax Technologies
          </div>
        </div>
      )}
    </Link>
  );
}
