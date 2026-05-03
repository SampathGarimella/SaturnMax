import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MessageSquare,
  Plus,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  ActionBar,
  EmptyState,
  InlineError,
  SearchInput,
  SectionHeader,
  StatusBadge,
} from "../../components/ui";
import {
  addInterviewReview,
  convertToConsultant,
  decideCandidate,
  moveHiringStage,
} from "../../lib/api";
import {
  HIRING_WORKFLOW_STAGES,
  getHiringStageMeta,
  getNextHiringStage,
  normalizeHiringStage,
} from "../../lib/workflow";
import { useOperations } from "./OperationsContext";
import { humanDate, sortRecent, textIncludes } from "./operationsUtils";

const EMPTY_REVIEW = {
  rating: "4",
  recommendation: "continue",
  notes: "",
};

const EMPTY_REJECT = {
  reason: "",
};

const CONSULTANT_TYPES = ["Contract", "Full-time", "Bench", "Client-assigned"];

export function buildHiringRows(data) {
  const candidateByUid = [...data.users, ...data.candidates].reduce((acc, item) => {
    const uid = item.uid || item.id;
    if (uid) acc[uid] = { ...(acc[uid] || {}), ...item, uid };
    return acc;
  }, {});
  const rows = data.applications.map((application) => {
    const uid = application.candidate_uid || application.uid || "";
    const candidate = candidateByUid[uid] || {};
    const resume = data.documents.find((doc) => doc.owner_uid === uid && doc.type === "resume");
    const workflowStage = normalizeHiringStage(
      application.workflowStage || candidate.workflowStage,
      application.status || application.lifecycle_stage
    );
    return {
      key: application.id,
      uid,
      application,
      candidate,
      name: application.full_name || application.candidate_name || candidate.name || "Candidate",
      email: application.email || candidate.email || "",
      phone: application.phone || candidate.phone || "",
      skills: application.primary_skills || candidate.primary_skills || (candidate.skills || []).join(", "),
      resumeUrl: application.resume_url || candidate.resume_url || resume?.file_url || "",
      workflowStage,
      interviewStatus: application.interviewStatus || candidate.interviewStatus || workflowStage,
      assignedEmployeeId: application.assignedEmployeeId || candidate.assignedEmployeeId || "",
      convertedToConsultantId: application.convertedToConsultantId || candidate.convertedToConsultantId || "",
      candidateApprovalStatus: application.candidateApprovalStatus || candidate.candidateApprovalStatus || "pending",
      updatedAt: application.updatedAt || application.updated_at || candidate.updatedAt,
      isProfileOnly: false,
    };
  });

  const applicationUids = new Set(rows.map((row) => row.uid).filter(Boolean));
  data.candidates.forEach((candidate) => {
    const uid = candidate.uid || candidate.id;
    if (!uid || applicationUids.has(uid)) return;
    const resume = data.documents.find((doc) => doc.owner_uid === uid && doc.type === "resume");
    rows.push({
      key: `profile-${uid}`,
      uid,
      application: {
        id: "",
        candidate_uid: uid,
        full_name: candidate.name,
        candidate_name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        primary_skills: candidate.primary_skills,
        workflowStage: normalizeHiringStage(candidate.workflowStage),
      },
      candidate,
      name: candidate.name || "Candidate",
      email: candidate.email || "",
      phone: candidate.phone || "",
      skills: candidate.primary_skills || (candidate.skills || []).join(", "),
      resumeUrl: candidate.resume_url || resume?.file_url || "",
      workflowStage: normalizeHiringStage(candidate.workflowStage),
      interviewStatus: candidate.interviewStatus || "not_started",
      assignedEmployeeId: candidate.assignedEmployeeId || "",
      convertedToConsultantId: candidate.convertedToConsultantId || "",
      candidateApprovalStatus: candidate.candidateApprovalStatus || "pending",
      updatedAt: candidate.updatedAt || candidate.updated_at,
      isProfileOnly: true,
    });
  });

  return sortRecent(rows, "updatedAt");
}

export default function OperationsHiringCandidates() {
  const { applicationId } = useParams();
  const { data, busy, setBusy, load, showMutationError } = useOperations();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [approval, setApproval] = useState("all");
  const [converted, setConverted] = useState("all");
  const [skill, setSkill] = useState("");
  const [assigned, setAssigned] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [inlineError, setInlineError] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectForm, setRejectForm] = useState(EMPTY_REJECT);
  const [convertTarget, setConvertTarget] = useState(null);
  const [convertForm, setConvertForm] = useState(null);
  const [preparedInvite, setPreparedInvite] = useState(null);

  const rows = useMemo(() => buildHiringRows(data), [data]);
  const assignedEmployees = useMemo(() => {
    const ids = Array.from(new Set(rows.map((row) => row.assignedEmployeeId).filter(Boolean)));
    return ids;
  }, [rows]);
  const filteredRows = useMemo(() => {
    const now = Date.now();
    return rows
      .filter((row) => stage === "all" || row.workflowStage === stage)
      .filter((row) => approval === "all" || row.candidateApprovalStatus === approval)
      .filter((row) => converted === "all" || (converted === "yes" ? row.convertedToConsultantId : !row.convertedToConsultantId))
      .filter((row) => assigned === "all" || row.assignedEmployeeId === assigned)
      .filter((row) => !skill || String(row.skills || "").toLowerCase().includes(skill.toLowerCase()))
      .filter((row) => {
        if (dateRange === "all") return true;
        const millis = new Date(row.updatedAt?.toDate?.() || row.updatedAt || row.updated_at || 0).getTime();
        if (!millis) return true;
        const days = dateRange === "7d" ? 7 : 30;
        return now - millis <= days * 86400000;
      })
      .filter((row) => textIncludes(row, query, ["name", "email", "phone", "skills", "assignedEmployeeId"]));
  }, [approval, assigned, converted, dateRange, query, rows, skill, stage]);

  const activeRow = rows.find((row) => row.key === applicationId);

  const clearModals = () => {
    setReviewTarget(null);
    setRejectTarget(null);
    setConvertTarget(null);
    setPreparedInvite(null);
  };

  const handleNextStage = async (row) => {
    const next = getNextHiringStage(row.workflowStage);
    if (!next) return;
    if (row.isProfileOnly) {
      toast.error("Create or select an application before moving a profile-only candidate.");
      return;
    }
    setBusy(`${row.key}-next`);
    setInlineError(null);
    try {
      await moveHiringStage(row.application, next);
      toast.success(`Moved to ${getHiringStageMeta(next).label}.`);
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Could not move hiring stage."));
    } finally {
      setBusy("");
    }
  };

  const handleApprove = async (row) => {
    if (row.isProfileOnly) {
      toast.error("Choose an application before approving a candidate.");
      return;
    }
    setBusy(`${row.key}-approve`);
    setInlineError(null);
    try {
      await decideCandidate(row.application, "approved");
      toast.success("Candidate approved.");
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Could not approve candidate."));
    } finally {
      setBusy("");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setBusy(`${rejectTarget.key}-reject`);
    setInlineError(null);
    try {
      await decideCandidate(rejectTarget.application, "rejected", rejectForm.reason);
      toast.success("Candidate rejected.");
      setRejectForm(EMPTY_REJECT);
      setRejectTarget(null);
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Could not reject candidate."));
    } finally {
      setBusy("");
    }
  };

  const handleReview = async (event) => {
    event.preventDefault();
    if (!reviewTarget) return;
    setBusy(`${reviewTarget.key}-review`);
    setInlineError(null);
    try {
      await addInterviewReview({
        application: reviewTarget.application,
        stage: reviewTarget.workflowStage,
        ...reviewForm,
      });
      toast.success("Interview review added.");
      setReviewForm(EMPTY_REVIEW);
      setReviewTarget(null);
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Could not add interview review."));
    } finally {
      setBusy("");
    }
  };

  const openConvert = (row) => {
    if (row.isProfileOnly) {
      toast.error("Choose an application before converting a candidate.");
      return;
    }
    setPreparedInvite(null);
    setConvertTarget(row);
    setConvertForm({
      consultantType: "Contract",
      roleTitle: row.application.position_title || row.candidate.roleTitle || "Consultant",
      startDate: "",
      clientName: "",
      workLocation: "India",
      rate: "",
      skills: row.skills || "",
      notes: "",
      overrideApproved: false,
      overrideReason: "",
    });
  };

  const handleConvert = async (event) => {
    event.preventDefault();
    if (!convertTarget || !convertForm) return;
    setBusy(`${convertTarget.key}-convert`);
    setInlineError(null);
    try {
      const result = await convertToConsultant(convertTarget.application, convertForm, {
        overrideApproved: convertForm.overrideApproved,
        overrideReason: convertForm.overrideReason,
      });
      setPreparedInvite(result.invite);
      toast.success("Candidate converted to consultant.");
      await load();
    } catch (err) {
      setInlineError(showMutationError(err, "Could not convert candidate."));
    } finally {
      setBusy("");
    }
  };

  const copyInvite = async () => {
    if (!preparedInvite) return;
    const text = `Subject: ${preparedInvite.subject}\n\n${preparedInvite.body}`;
    try {
      await navigator.clipboard?.writeText(text);
      toast.success("Invitation message copied.");
    } catch {
      toast.error("Copy failed. Select the message text manually.");
    }
  };

  if (applicationId) {
    return (
      <CandidateDetail
        row={activeRow}
        data={data}
        busy={busy}
        inlineError={inlineError}
        onReview={(row) => setReviewTarget(row)}
        onNext={handleNextStage}
        onApprove={handleApprove}
        onReject={(row) => setRejectTarget(row)}
        onConvert={openConvert}
      >
        <WorkflowModals
          reviewTarget={reviewTarget}
          reviewForm={reviewForm}
          setReviewForm={setReviewForm}
          onReview={handleReview}
          rejectTarget={rejectTarget}
          rejectForm={rejectForm}
          setRejectForm={setRejectForm}
          onReject={handleReject}
          convertTarget={convertTarget}
          convertForm={convertForm}
          setConvertForm={setConvertForm}
          onConvert={handleConvert}
          preparedInvite={preparedInvite}
          copyInvite={copyInvite}
          busy={busy}
          clearModals={clearModals}
        />
      </CandidateDetail>
    );
  }

  return (
    <div className="space-y-5" data-testid="operations-hiring-candidates-page">
      <SectionHeader
        eyebrow="Hiring Workflow"
        title="Candidate -> Consultant Workflow"
        description="Review candidates, capture interview feedback, approve hiring decisions, and convert approved candidates into consultants."
      />

      <ActionBar className="flex-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, phone, skills, or assignee" />
        <select className={selectClass} value={stage} onChange={(event) => setStage(event.target.value)} aria-label="Filter by workflow stage">
          <option value="all">All stages</option>
          {HIRING_WORKFLOW_STAGES.map((value) => (
            <option key={value} value={value}>{getHiringStageMeta(value).label}</option>
          ))}
        </select>
        <select className={selectClass} value={approval} onChange={(event) => setApproval(event.target.value)} aria-label="Filter by approval status">
          <option value="all">All decisions</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input className={selectClass} value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Skill filter" aria-label="Filter by skill" />
        <select className={selectClass} value={assigned} onChange={(event) => setAssigned(event.target.value)} aria-label="Filter by assigned employee">
          <option value="all">All assignees</option>
          {assignedEmployees.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
        <select className={selectClass} value={converted} onChange={(event) => setConverted(event.target.value)} aria-label="Filter by conversion status">
          <option value="all">All conversions</option>
          <option value="yes">Converted</option>
          <option value="no">Not converted</option>
        </select>
        <select className={selectClass} value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter by date range">
          <option value="all">Any update date</option>
          <option value="7d">Updated last 7 days</option>
          <option value="30d">Updated last 30 days</option>
        </select>
      </ActionBar>

      {inlineError && <InlineError title={inlineError.title} body={inlineError.body} onRetry={() => setInlineError(null)} />}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.8fr_1.2fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid">
          <div>Candidate</div>
          <div>Skills / Resume</div>
          <div>Stage</div>
          <div>Interview</div>
          <div>Conversion</div>
          <div>Actions</div>
        </div>
        {filteredRows.length === 0 && (
          <EmptyState title="No candidates match this view" body="Try another filter or wait for new candidate applications." Icon={UserRound} className="m-4" />
        )}
        {filteredRows.map((row) => (
          <CandidateRow
            key={row.key}
            row={row}
            busy={busy}
            onReview={() => setReviewTarget(row)}
            onNext={() => handleNextStage(row)}
            onApprove={() => handleApprove(row)}
            onReject={() => setRejectTarget(row)}
            onConvert={() => openConvert(row)}
          />
        ))}
      </div>

      <WorkflowModals
        reviewTarget={reviewTarget}
        reviewForm={reviewForm}
        setReviewForm={setReviewForm}
        onReview={handleReview}
        rejectTarget={rejectTarget}
        rejectForm={rejectForm}
        setRejectForm={setRejectForm}
        onReject={handleReject}
        convertTarget={convertTarget}
        convertForm={convertForm}
        setConvertForm={setConvertForm}
        onConvert={handleConvert}
        preparedInvite={preparedInvite}
        copyInvite={copyInvite}
        busy={busy}
        clearModals={clearModals}
      />
    </div>
  );
}

function CandidateRow({ row, busy, onReview, onNext, onApprove, onReject, onConvert }) {
  const next = getNextHiringStage(row.workflowStage);
  return (
    <article className="grid grid-cols-1 gap-4 border-b border-slate-100 p-4 last:border-b-0 lg:grid-cols-[1.1fr_1fr_0.9fr_0.8fr_0.8fr_1.2fr] lg:items-center">
      <div className="min-w-0">
        <div className="font-semibold text-slate-900">{row.name}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{row.email || "email not set"}</div>
        <div className="mt-1 text-xs text-slate-500">{row.phone || "phone not set"}</div>
        <div className="mt-2 text-[11px] text-slate-400">Assigned: {row.assignedEmployeeId || "Unassigned"} / {humanDate(row.updatedAt)}</div>
      </div>
      <div className="min-w-0">
        <div className="line-clamp-2 text-sm text-slate-700">{row.skills || "Skills not provided"}</div>
        {row.resumeUrl ? (
          <a href={row.resumeUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
            Open resume
          </a>
        ) : (
          <div className="mt-2 text-xs text-slate-400">No resume link</div>
        )}
      </div>
      <StatusBadge value={row.workflowStage} type="hiring" />
      <StatusBadge value={row.interviewStatus || "pending"} withIcon={false} />
      <div>
        <StatusBadge value={row.convertedToConsultantId ? "converted" : row.candidateApprovalStatus || "pending"} withIcon={false} />
        <div className="mt-1 text-[11px] text-slate-400">{row.convertedToConsultantId || "Not converted"}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/employee-dashboard/hiring/candidates/${row.key}`} className={smallButtonClass}>View Profile</Link>
        <button onClick={onReview} disabled={row.isProfileOnly} className={smallButtonClass}>Add Review</button>
        <button onClick={onNext} disabled={!next || row.isProfileOnly || busy === `${row.key}-next`} className={smallButtonClass}>
          {busy === `${row.key}-next` ? "Moving..." : "Next Stage"}
        </button>
        <button onClick={onApprove} disabled={row.isProfileOnly || row.candidateApprovalStatus === "approved"} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">Approve</button>
        <button onClick={onReject} disabled={row.isProfileOnly} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">Reject</button>
        <button onClick={onConvert} disabled={row.isProfileOnly || Boolean(row.convertedToConsultantId)} className="rounded-md bg-[#0A192F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0e2445] disabled:opacity-60">Convert</button>
      </div>
    </article>
  );
}

function CandidateDetail({ row, data, busy, inlineError, onReview, onNext, onApprove, onReject, onConvert, children }) {
  if (!row) {
    return (
      <div className="space-y-5">
        <Link to="/employee-dashboard/hiring/candidates" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
          <ArrowLeft className="h-4 w-4" />
          Back to candidates
        </Link>
        <EmptyState title="Candidate not found" body="Refresh the Employee Portal or choose another candidate." Icon={UserRound} />
      </div>
    );
  }
  const reviews = data.reviews.filter((review) => review.type === "interview_review" && (review.application_id === row.application.id || review.candidate_uid === row.uid));
  const documents = data.documents.filter((document) => document.owner_uid === row.uid || document.application_id === row.application.id);
  const logs = data.activityLogs.filter((log) => log.targetId === row.application.id || log.targetId === row.uid);

  return (
    <div className="space-y-5" data-testid="operations-candidate-detail-page">
      <Link to="/employee-dashboard/hiring/candidates" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB]">
        <ArrowLeft className="h-4 w-4" />
        Back to candidates
      </Link>
      <SectionHeader
        eyebrow="Candidate profile"
        title={row.name}
        description={`${row.email || "email missing"} / ${row.phone || "phone missing"}`}
        actions={
          <>
            <button onClick={() => onReview(row)} disabled={row.isProfileOnly} className={smallButtonClass}><Plus className="h-3.5 w-3.5" /> Add Review</button>
            <button onClick={() => onNext(row)} disabled={row.isProfileOnly || busy === `${row.key}-next`} className={smallButtonClass}>Move to Next Stage</button>
            <button onClick={() => onApprove(row)} disabled={row.isProfileOnly || row.candidateApprovalStatus === "approved"} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
            <button onClick={() => onReject(row)} disabled={row.isProfileOnly} className="inline-flex h-10 items-center gap-2 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"><XCircle className="h-3.5 w-3.5" /> Reject</button>
            <button onClick={() => onConvert(row)} disabled={row.isProfileOnly || Boolean(row.convertedToConsultantId)} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0A192F] px-3 text-xs font-semibold text-white hover:bg-[#0e2445] disabled:opacity-60"><BriefcaseBusiness className="h-3.5 w-3.5" /> Convert</button>
          </>
        }
      />
      {inlineError && <InlineError title={inlineError.title} body={inlineError.body} />}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card title="Workflow stage">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {HIRING_WORKFLOW_STAGES.map((stage) => {
                const active = HIRING_WORKFLOW_STAGES.indexOf(stage) <= HIRING_WORKFLOW_STAGES.indexOf(row.workflowStage);
                return (
                  <div key={stage} className={`rounded-xl border p-3 text-xs ${active ? "border-[#2563EB]/30 bg-blue-50 text-[#1D4ED8]" : "border-slate-200 bg-white text-slate-500"}`}>
                    <div className="font-semibold">{getHiringStageMeta(stage).label}</div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Interview reviews">
            {reviews.length === 0 && <EmptyState title="No interview reviews yet" body="Add review notes after screening or interviews." Icon={MessageSquare} />}
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={review.stage || "screening"} type="hiring" />
                    <span className="text-xs font-semibold text-slate-700">Rating {review.rating || "-"}</span>
                    <span className="text-xs text-slate-500">{review.recommendation || "continue"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.notes}</p>
                  <div className="mt-2 text-[11px] text-slate-400">{humanDate(review.createdAt || review.created_at)}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Audit/history timeline">
            {logs.length === 0 && <EmptyState title="No workflow history yet" body="Hiring decisions and conversion events will appear here." />}
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-slate-900">{String(log.action || "activity").replace(/_/g, " ")}</div>
                  <div className="mt-1 text-xs text-slate-500">{log.actorEmail || log.actorUid || "Operator"} / {humanDate(log.createdAt || log.created_at)}</div>
                  {log.reason && <div className="mt-2 text-xs text-rose-700">{log.reason}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Candidate summary">
            <Mini label="Role" value={row.application.position_title || "Open role"} />
            <Mini label="Skills" value={row.skills || "Not provided"} />
            <Mini label="Assigned employee" value={row.assignedEmployeeId || "Unassigned"} />
            <Mini label="Decision" value={row.candidateApprovalStatus || "pending"} />
          </Card>
          <Card title="Resume and documents">
            {documents.length === 0 && <EmptyState title="No documents yet" body="Resume and onboarding files will appear here when uploaded." Icon={FileText} />}
            <div className="space-y-2">
              {documents.map((document) => (
                <a key={document.id} href={document.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <span className="font-semibold text-slate-800">{document.title || document.type}</span>
                  <StatusBadge value={document.status || "uploaded"} withIcon={false} />
                </a>
              ))}
            </div>
          </Card>
          <Card title="Conversion panel">
            <div className="space-y-3 text-sm text-slate-600">
              <div>Current status: <span className="font-semibold text-slate-900">{row.convertedToConsultantId ? "Converted" : "Not converted"}</span></div>
              <div>Consultant ID: <span className="font-semibold text-slate-900">{row.convertedToConsultantId || "Pending"}</span></div>
              <button onClick={() => onConvert(row)} disabled={row.isProfileOnly || Boolean(row.convertedToConsultantId)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
                Convert to Consultant
              </button>
            </div>
          </Card>
        </div>
      </section>
      {children}
    </div>
  );
}

function WorkflowModals(props) {
  const {
    reviewTarget,
    reviewForm,
    setReviewForm,
    onReview,
    rejectTarget,
    rejectForm,
    setRejectForm,
    onReject,
    convertTarget,
    convertForm,
    setConvertForm,
    onConvert,
    preparedInvite,
    copyInvite,
    busy,
    clearModals,
  } = props;
  return (
    <>
      <PanelModal open={Boolean(reviewTarget)} title="Add interview review" onClose={clearModals}>
        <form onSubmit={onReview} className="space-y-4">
          <Field label="Stage">
            <input className={inputClass} value={reviewTarget ? getHiringStageMeta(reviewTarget.workflowStage).label : ""} disabled />
          </Field>
          <Field label="Rating">
            <select className={inputClass} value={reviewForm.rating} onChange={(event) => setReviewForm((form) => ({ ...form, rating: event.target.value }))}>
              <option value="5">5 - Strong hire</option>
              <option value="4">4 - Hire</option>
              <option value="3">3 - Hold</option>
              <option value="2">2 - Weak</option>
              <option value="1">1 - Reject</option>
            </select>
          </Field>
          <Field label="Recommendation">
            <select className={inputClass} value={reviewForm.recommendation} onChange={(event) => setReviewForm((form) => ({ ...form, recommendation: event.target.value }))}>
              <option value="continue">Continue</option>
              <option value="hold">Hold</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
            </select>
          </Field>
          <Field label="Review notes">
            <textarea className={`${inputClass} h-28 py-3`} value={reviewForm.notes} onChange={(event) => setReviewForm((form) => ({ ...form, notes: event.target.value }))} />
          </Field>
          <ModalActions busy={busy?.endsWith("-review")} onCancel={clearModals} confirmLabel="Save review" />
        </form>
      </PanelModal>

      <PanelModal open={Boolean(rejectTarget)} title="Reject candidate" onClose={clearModals}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Add a clear internal reason before rejecting this candidate.</p>
          <Field label="Rejection reason">
            <textarea className={`${inputClass} h-28 py-3`} value={rejectForm.reason} onChange={(event) => setRejectForm({ reason: event.target.value })} />
          </Field>
          <ModalActions busy={busy?.endsWith("-reject")} onCancel={clearModals} onConfirm={onReject} confirmLabel="Reject candidate" destructive />
        </div>
      </PanelModal>

      <PanelModal open={Boolean(convertTarget)} title="Convert Candidate to Consultant" onClose={clearModals} wide>
        {convertForm && (
          <form onSubmit={onConvert} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="font-semibold text-slate-900">{convertTarget?.name}</div>
              <div className="mt-1 text-slate-500">{convertTarget?.email}</div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Consultant type">
                <select className={inputClass} value={convertForm.consultantType} onChange={(event) => setConvertForm((form) => ({ ...form, consultantType: event.target.value }))}>
                  {CONSULTANT_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </Field>
              <Field label="Role title">
                <input className={inputClass} value={convertForm.roleTitle} onChange={(event) => setConvertForm((form) => ({ ...form, roleTitle: event.target.value }))} />
              </Field>
              <Field label="Start date">
                <input type="date" className={inputClass} value={convertForm.startDate} onChange={(event) => setConvertForm((form) => ({ ...form, startDate: event.target.value }))} />
              </Field>
              <Field label="Client name">
                <input className={inputClass} value={convertForm.clientName} onChange={(event) => setConvertForm((form) => ({ ...form, clientName: event.target.value }))} />
              </Field>
              <Field label="Work location">
                <input className={inputClass} value={convertForm.workLocation} onChange={(event) => setConvertForm((form) => ({ ...form, workLocation: event.target.value }))} />
              </Field>
              <Field label="Rate / salary">
                <input className={inputClass} value={convertForm.rate} onChange={(event) => setConvertForm((form) => ({ ...form, rate: event.target.value }))} placeholder="INR 1,80,000" />
              </Field>
              <Field label="Skills confirmation" className="md:col-span-2">
                <input className={inputClass} value={convertForm.skills} onChange={(event) => setConvertForm((form) => ({ ...form, skills: event.target.value }))} />
              </Field>
              <Field label="Notes" className="md:col-span-2">
                <textarea className={`${inputClass} h-24 py-3`} value={convertForm.notes} onChange={(event) => setConvertForm((form) => ({ ...form, notes: event.target.value }))} />
              </Field>
            </div>
            {convertTarget?.candidateApprovalStatus !== "approved" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <label className="flex items-start gap-3 text-sm font-semibold text-amber-900">
                  <input type="checkbox" className="mt-1" checked={convertForm.overrideApproved} onChange={(event) => setConvertForm((form) => ({ ...form, overrideApproved: event.target.checked }))} />
                  Convert before formal approval
                </label>
                {convertForm.overrideApproved && (
                  <textarea className={`${inputClass} mt-3 h-20 py-3`} placeholder="Override reason" value={convertForm.overrideReason} onChange={(event) => setConvertForm((form) => ({ ...form, overrideReason: event.target.value }))} />
                )}
              </div>
            )}
            {preparedInvite && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="font-semibold text-emerald-900">Consultant invite prepared</div>
                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">{`Subject: ${preparedInvite.subject}\n\n${preparedInvite.body}`}</pre>
                <button type="button" onClick={copyInvite} className="mt-3 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Copy invite</button>
              </div>
            )}
            <ModalActions busy={busy?.endsWith("-convert")} onCancel={clearModals} confirmLabel="Convert candidate" />
          </form>
        )}
      </PanelModal>
    </>
  );
}

function PanelModal({ open, title, children, onClose, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 px-4 py-8" role="presentation">
      <section role="dialog" aria-modal="true" className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-heading text-xl font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Close</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ModalActions({ busy, onCancel, onConfirm, confirmLabel, destructive = false }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} disabled={busy} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
      <button type={onConfirm ? "button" : "submit"} onClick={onConfirm} disabled={busy} className={`inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60 ${destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-[#2563EB] hover:bg-[#1D4ED8]"}`}>
        {busy ? "Working..." : confirmLabel}
      </button>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-heading text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]";

const selectClass =
  "h-10 min-w-[10rem] rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]";

const smallButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
