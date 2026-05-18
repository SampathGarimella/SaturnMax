import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BRAND_NAME, SUPPORT_EMAIL } from "../lib/brand";
import { ROLE_HOME, ROLE_STATUS } from "../lib/constants";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, roleStatus, roleError } = useAuth();
  const location = useLocation();

  if (loading || roleStatus === ROLE_STATUS.LOADING) {
    return <div className="p-6 text-sm text-slate-500">Checking access...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roleStatus === ROLE_STATUS.UNKNOWN) {
    return (
      <AccessState
        title="Account role needs setup"
        body={roleError || `Your account exists, but a ${BRAND_NAME} role has not been assigned yet.`}
      />
    );
  }

  if (roleStatus === ROLE_STATUS.ERROR) {
    return (
      <AccessState
        title="Could not verify access"
        body={roleError || "Please refresh and try again, or contact support if this continues."}
      />
    );
  }

  const role = user.role;
  if (Array.isArray(allowedRoles) && allowedRoles.length && !allowedRoles.includes(role)) {
    return (
      <AccessState
        title="Access denied"
        body="This account does not have access to the requested portal."
        home={ROLE_HOME[role] || "/"}
      />
    );
  }

  return children;
}

function AccessState({ title, body, home = "/" }) {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-6 py-16">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Retry
          </button>
          <Link
            to={home}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
          >
            Go to my portal
          </Link>
        </div>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-5 inline-flex text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
        >
          Contact access support
        </a>
      </section>
    </main>
  );
}
