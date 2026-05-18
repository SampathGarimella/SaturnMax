"""Company Private Limited - FastAPI backend.

Provides:
- Job listings (seeded on startup)
- Candidate application submissions (persisted + email via Resend)
- Contact messages (persisted + email via Resend)
- Candidate dashboard data (profile stats, applications, activity)
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import JSONResponse

try:
    import resend  # type: ignore
except Exception:  # pragma: no cover - should always be installed
    resend = None  # noqa: N816

# ---------------------------------------------------------------------------
# Environment & logging
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("company")


def split_csv(value: Optional[str], default: List[str]) -> List[str]:
    if value is None or value.strip() == "":
        return default
    return [chunk.strip() for chunk in value.split(",") if chunk.strip()]


MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
CORS_ORIGINS = split_csv(
    os.environ.get("CORS_ORIGINS"),
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://example.com",
        "https://www.example.com",
    ],
)
ALLOW_ALL_ORIGINS = "*" in CORS_ORIGINS
ALLOWED_HOSTS = split_csv(
    os.environ.get("ALLOWED_HOSTS"),
    [
        "localhost",
        "127.0.0.1",
        "example.com",
        "www.example.com",
        "*.preview.emergentagent.com",
    ],
)
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "").strip()
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("RATE_LIMIT_MAX_REQUESTS", "12"))
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev").strip()
RECIPIENT_EMAIL = os.environ.get("RECIPIENT_EMAIL", "info@example.com").strip()

if resend is not None and RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend configured — transactional emails enabled.")
else:
    logger.warning(
        "RESEND_API_KEY is empty. Emails will be skipped gracefully. "
        "Paste your key into /app/backend/.env (RESEND_API_KEY=re_...) and "
        "restart the backend when ready."
    )

# ---------------------------------------------------------------------------
# MongoDB
# ---------------------------------------------------------------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

jobs_col = db["jobs"]
applications_col = db["applications"]
candidates_col = db["candidates"]
activities_col = db["activities"]
contacts_col = db["contact_messages"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
INDIA_PHONE_RE = re.compile(r"^(?:\+91[-\s]?|0)?[6-9]\d{9}$")
CTC_LPA_RE = re.compile(r"^\d{1,3}(?:\.\d{1,2})?$")
HTTPS_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


class MemoryRateLimiter:
    def __init__(self, window_seconds: int, max_requests: int) -> None:
        self.window_seconds = max(window_seconds, 1)
        self.max_requests = max(max_requests, 1)
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.time()
        queue = self._hits[key]
        cutoff = now - self.window_seconds
        while queue and queue[0] < cutoff:
            queue.popleft()
        if len(queue) >= self.max_requests:
            return False
        queue.append(now)
        return True


application_limiter = MemoryRateLimiter(
    window_seconds=RATE_LIMIT_WINDOW_SECONDS,
    max_requests=RATE_LIMIT_MAX_REQUESTS,
)
contact_limiter = MemoryRateLimiter(
    window_seconds=RATE_LIMIT_WINDOW_SECONDS,
    max_requests=max(3, RATE_LIMIT_MAX_REQUESTS // 2),
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def require_admin_key(request: Request) -> None:
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=503, detail="Admin API key not configured")
    key = request.headers.get("x-admin-key", "")
    if key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def validate_application_payload(payload: "ApplicationCreate") -> None:
    normalized_phone = re.sub(r"\s+", "", payload.phone or "")
    if not INDIA_PHONE_RE.match(normalized_phone):
        raise HTTPException(
            status_code=422,
            detail="Phone must be a valid Indian mobile number (for example +91 9876543210).",
        )

    for field_name, value in [
        ("current_ctc_lpa", payload.current_ctc_lpa),
        ("expected_ctc_lpa", payload.expected_ctc_lpa),
    ]:
        if value and not CTC_LPA_RE.match(value.strip()):
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} must be a numeric LPA value (for example 8 or 12.5).",
            )

    for field_name, value in [
        ("portfolio_url", payload.portfolio_url),
        ("resume_url", payload.resume_url),
    ]:
        if value and not HTTPS_URL_RE.match(value.strip()):
            raise HTTPException(
                status_code=422,
                detail=f"{field_name} must start with http:// or https://",
            )


async def send_email_async(subject: str, html: str, to: Optional[str] = None) -> dict:
    """Send an email through Resend without blocking the event loop.

    Fails gracefully (returns ``{"sent": False, ...}``) when the API key is
    missing or the Resend SDK raises — we never want a bad key to break the
    user-facing form submission.
    """
    recipient = to or RECIPIENT_EMAIL
    if not RESEND_API_KEY or resend is None:
        logger.info("Skipping email to %s — Resend key not configured.", recipient)
        return {"sent": False, "reason": "RESEND_API_KEY not configured"}

    params = {
        "from": SENDER_EMAIL,
        "to": [recipient],
        "subject": subject,
        "html": html,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Email sent to %s — id=%s", recipient, result.get("id"))
        return {"sent": True, "id": result.get("id")}
    except Exception as exc:  # pragma: no cover - network
        logger.exception("Resend send failed: %s", exc)
        return {"sent": False, "reason": str(exc)}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class Job(BaseModel):
    id: str
    title: str
    department: str
    employment_type: str  # "Full-time" | "Contract" | "Freelance"
    work_mode: str  # "Remote" | "Hybrid" | "Remote USA"
    experience: str
    tags: List[str]
    description: str
    is_hot: bool = False
    is_urgent: bool = False
    created_at: str


class ApplicationCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=40)
    years_experience: str
    position_id: Optional[str] = None
    position_title: str
    portfolio_url: Optional[str] = None
    resume_url: Optional[str] = None
    current_location: Optional[str] = Field(default=None, max_length=160)
    current_company: Optional[str] = Field(default=None, max_length=160)
    notice_period: Optional[str] = Field(default=None, max_length=80)
    current_ctc_lpa: Optional[str] = Field(default=None, max_length=40)
    expected_ctc_lpa: Optional[str] = Field(default=None, max_length=40)
    preferred_work_mode: Optional[str] = Field(default=None, max_length=80)
    primary_skills: Optional[str] = Field(default=None, max_length=500)
    introduction: Optional[str] = Field(default="", max_length=2000)


class Application(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    phone: str
    years_experience: str
    position_id: Optional[str] = None
    position_title: str
    portfolio_url: Optional[str] = None
    resume_url: Optional[str] = None
    current_location: Optional[str] = None
    current_company: Optional[str] = None
    notice_period: Optional[str] = None
    current_ctc_lpa: Optional[str] = None
    expected_ctc_lpa: Optional[str] = None
    preferred_work_mode: Optional[str] = None
    primary_skills: Optional[str] = None
    introduction: Optional[str] = ""
    status: Literal["pending", "under_review", "interview", "not_shortlisted", "offer"] = "pending"
    applied_ago: Optional[str] = None  # rendered on dashboard
    created_at: str


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    subject: str
    company: Optional[str] = Field(default=None, max_length=160)
    budget_range: Optional[str] = Field(default=None, max_length=80)
    timeline: Optional[str] = Field(default=None, max_length=80)
    message: str = Field(..., min_length=5, max_length=4000)


class ContactMessage(BaseModel):
    id: str
    name: str
    email: EmailStr
    subject: str
    company: Optional[str] = None
    budget_range: Optional[str] = None
    timeline: Optional[str] = None
    message: str
    created_at: str


class Candidate(BaseModel):
    id: str
    email: EmailStr
    name: str
    role_label: str = "Job Candidate"
    phone: Optional[str] = None
    portfolio_url: Optional[str] = None
    resume_uploaded: bool = False
    profile_complete_percent: int = 0
    profile_checklist: dict
    created_at: str


class DashboardStats(BaseModel):
    applications_sent: int
    applications_delta_week: int
    interviews_scheduled: int
    next_interview: Optional[str] = None
    profile_views: int
    profile_views_delta_week: int
    profile_complete_percent: int


class Activity(BaseModel):
    id: str
    candidate_email: EmailStr
    title: str
    timestamp_label: str
    color: Literal["green", "blue", "amber", "red"] = "blue"
    created_at: str


class DashboardResponse(BaseModel):
    candidate: Candidate
    stats: DashboardStats
    applications: List[Application]
    activity: List[Activity]
    unread_messages: int


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------
SEED_JOBS: List[dict] = [
    {
        "id": "job-fullstack-senior",
        "title": "Senior Full Stack Developer (React + Node)",
        "department": "Engineering",
        "employment_type": "Full-time",
        "work_mode": "Remote",
        "experience": "3–6 yrs exp",
        "tags": ["Full-time", "Remote", "3–6 yrs exp", "US project"],
        "description": (
            "Build customer-facing React + Node applications for US SaaS clients. "
            "You'll own features end-to-end, from API design to UI polish."
        ),
        "is_hot": False,
        "is_urgent": False,
    },
    {
        "id": "job-ai-ml",
        "title": "AI/ML Engineer — LLM & Agentic Systems",
        "department": "AI",
        "employment_type": "Full-time",
        "work_mode": "Remote",
        "experience": "2–5 yrs exp",
        "tags": ["Full-time", "Remote", "2–5 yrs exp", "Hot role"],
        "description": (
            "Ship LLM-powered products: RAG pipelines, agents, evals. "
            "Comfort with OpenAI / Anthropic / Gemini APIs required."
        ),
        "is_hot": True,
        "is_urgent": False,
    },
    {
        "id": "job-devops",
        "title": "Cloud & DevOps Engineer (AWS/GCP)",
        "department": "Infrastructure",
        "employment_type": "Full-time",
        "work_mode": "Hybrid",
        "experience": "3–7 yrs exp",
        "tags": ["Full-time", "Hybrid", "3–7 yrs exp", "US project"],
        "description": (
            "Design, automate, and optimize cloud infrastructure on AWS and GCP for "
            "regulated US customers. Terraform, Kubernetes, observability."
        ),
        "is_hot": False,
        "is_urgent": False,
    },
    {
        "id": "job-data-engineer",
        "title": "Data Engineer (dbt, Snowflake, Python)",
        "department": "Data",
        "employment_type": "Contract",
        "work_mode": "Remote",
        "experience": "2–4 yrs exp",
        "tags": ["Contract", "Remote", "2–4 yrs exp", "Urgent"],
        "description": (
            "Own the modern data stack for a US fintech: ingestion, modeling, "
            "transformation, and lineage. dbt + Snowflake + Airflow."
        ),
        "is_hot": False,
        "is_urgent": True,
    },
    {
        "id": "job-sales-partner",
        "title": "US Sales Partner / Business Development (Commission)",
        "department": "GTM",
        "employment_type": "Freelance",
        "work_mode": "Remote USA",
        "experience": "Any exp",
        "tags": ["Freelance", "Remote USA", "Any exp", "15% commission"],
        "description": (
            "Open doors at US SMBs and mid-market. We close, you earn 15% commission "
            "on signed contracts. Uncapped."
        ),
        "is_hot": False,
        "is_urgent": False,
    },
]


SEED_CANDIDATE_EMAIL = "rahul@email.com"

SEED_CANDIDATE = {
    "id": "cand-rahul-sharma",
    "email": SEED_CANDIDATE_EMAIL,
    "name": "Rahul Sharma",
    "role_label": "Job Candidate",
    "phone": "+91 98765 43210",
    "portfolio_url": None,
    "resume_uploaded": False,
    "profile_complete_percent": 72,
    "profile_checklist": {
        "basic_info": True,
        "work_preference": True,
        "portfolio_url": False,
        "resume_uploaded": False,
    },
}

SEED_APPLICATIONS: List[dict] = [
    {
        "id": "app-aiml-rahul",
        "full_name": "Rahul Sharma",
        "email": SEED_CANDIDATE_EMAIL,
        "phone": "+91 98765 43210",
        "years_experience": "3–5",
        "position_id": "job-ai-ml",
        "position_title": "AI/ML Engineer",
        "portfolio_url": "linkedin.com/in/rahulsharma",
        "introduction": "LLM + RAG experience from prior fintech role.",
        "status": "under_review",
        "applied_ago": "2 days ago",
    },
    {
        "id": "app-fullstack-rahul",
        "full_name": "Rahul Sharma",
        "email": SEED_CANDIDATE_EMAIL,
        "phone": "+91 98765 43210",
        "years_experience": "3–5",
        "position_id": "job-fullstack-senior",
        "position_title": "Senior Full Stack Dev",
        "portfolio_url": "linkedin.com/in/rahulsharma",
        "introduction": "React + Node, shipped 3 B2B apps.",
        "status": "interview",
        "applied_ago": "5 days ago",
    },
    {
        "id": "app-devops-rahul",
        "full_name": "Rahul Sharma",
        "email": SEED_CANDIDATE_EMAIL,
        "phone": "+91 98765 43210",
        "years_experience": "3–5",
        "position_id": "job-devops",
        "position_title": "Cloud DevOps Engineer",
        "portfolio_url": "linkedin.com/in/rahulsharma",
        "introduction": "Terraform + AWS prod experience.",
        "status": "pending",
        "applied_ago": "1 week ago",
    },
    {
        "id": "app-data-rahul",
        "full_name": "Rahul Sharma",
        "email": SEED_CANDIDATE_EMAIL,
        "phone": "+91 98765 43210",
        "years_experience": "3–5",
        "position_id": "job-data-engineer",
        "position_title": "Data Engineer",
        "portfolio_url": "linkedin.com/in/rahulsharma",
        "introduction": "dbt, Snowflake, Python.",
        "status": "not_shortlisted",
        "applied_ago": "2 weeks ago",
    },
]


SEED_ACTIVITY: List[dict] = [
    {
        "id": "act-1",
        "candidate_email": SEED_CANDIDATE_EMAIL,
        "title": "Interview scheduled for Senior Full Stack Dev role",
        "timestamp_label": "Today, 9:42am",
        "color": "green",
    },
    {
        "id": "act-2",
        "candidate_email": SEED_CANDIDATE_EMAIL,
        "title": "Your profile was viewed by a recruiter",
        "timestamp_label": "Yesterday, 3:15pm",
        "color": "blue",
    },
    {
        "id": "act-3",
        "candidate_email": SEED_CANDIDATE_EMAIL,
        "title": "AI/ML Engineer application is under review",
        "timestamp_label": "2 days ago",
        "color": "amber",
    },
    {
        "id": "act-4",
        "candidate_email": SEED_CANDIDATE_EMAIL,
        "title": "New message from HR team received",
        "timestamp_label": "3 days ago",
        "color": "blue",
    },
    {
        "id": "act-5",
        "candidate_email": SEED_CANDIDATE_EMAIL,
        "title": "Data Engineer application not shortlisted",
        "timestamp_label": "1 week ago",
        "color": "red",
    },
]


async def seed_database() -> None:
    """Idempotent seed so the dashboard always has real data to render."""
    created_at = now_iso()

    for job in SEED_JOBS:
        await jobs_col.update_one(
            {"id": job["id"]},
            {"$setOnInsert": {**job, "created_at": created_at}},
            upsert=True,
        )

    await candidates_col.update_one(
        {"email": SEED_CANDIDATE_EMAIL},
        {"$setOnInsert": {**SEED_CANDIDATE, "created_at": created_at}},
        upsert=True,
    )

    for app_doc in SEED_APPLICATIONS:
        await applications_col.update_one(
            {"id": app_doc["id"]},
            {"$setOnInsert": {**app_doc, "created_at": created_at}},
            upsert=True,
        )

    for act in SEED_ACTIVITY:
        await activities_col.update_one(
            {"id": act["id"]},
            {"$setOnInsert": {**act, "created_at": created_at}},
            upsert=True,
        )

    logger.info(
        "Seed complete: %d jobs, %d applications, %d activity entries.",
        len(SEED_JOBS),
        len(SEED_APPLICATIONS),
        len(SEED_ACTIVITY),
    )


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Company Private Limited API", version="1.0.0")

app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if not ALLOW_ALL_ORIGINS else ["*"],
    allow_credentials=not ALLOW_ALL_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_envelope(request: Request, call_next):
    req_id = request.headers.get("x-request-id") or new_id()
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:  # pragma: no cover - network/runtime failure
        logger.exception("Unhandled error req=%s path=%s err=%s", req_id, request.url.path, exc)
        response = JSONResponse(status_code=500, content={"detail": "Internal server error"})

    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    logger.info(
        "req=%s ip=%s %s %s -> %s %.1fms",
        req_id,
        client_ip(request),
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.on_event("startup")
async def on_startup() -> None:
    await jobs_col.create_index("id", unique=True)
    await applications_col.create_index("id", unique=True)
    await applications_col.create_index("email")
    await candidates_col.create_index("email", unique=True)
    await activities_col.create_index("candidate_email")
    await contacts_col.create_index("created_at")
    await seed_database()


@app.get("/api/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "company-api",
        "email_provider": "resend",
        "email_configured": bool(RESEND_API_KEY),
        "timestamp": now_iso(),
    }


# ---- Jobs -----------------------------------------------------------------
@app.get("/api/jobs", response_model=List[Job])
async def list_jobs() -> List[Job]:
    docs = await jobs_col.find({}, {"_id": 0}).sort("created_at", 1).to_list(length=200)
    return [Job(**d) for d in docs]


@app.get("/api/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str) -> Job:
    doc = await jobs_col.find_one({"id": job_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return Job(**doc)


# ---- Applications ---------------------------------------------------------
def application_email_html(data: ApplicationCreate, app_id: str) -> str:
    return f"""
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#0a192f;padding:24px 28px;">
                    <div style="color:#ffffff;font-size:18px;font-weight:700;">Company Private Limited</div>
                    <div style="color:#94a3b8;font-size:12px;margin-top:4px;">New candidate application</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 12px 0;font-size:20px;">New application: {data.position_title}</h2>
                    <p style="margin:0 0 20px 0;color:#475569;font-size:14px;">
                      A new candidate just applied via example.com.
                    </p>
                    <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
                      <tr><td style="color:#64748b;width:150px;">Name</td><td><strong>{data.full_name}</strong></td></tr>
                      <tr><td style="color:#64748b;">Email</td><td>{data.email}</td></tr>
                      <tr><td style="color:#64748b;">Phone</td><td>{data.phone}</td></tr>
                      <tr><td style="color:#64748b;">Position</td><td>{data.position_title}</td></tr>
                      <tr><td style="color:#64748b;">Years of experience</td><td>{data.years_experience}</td></tr>
                      <tr><td style="color:#64748b;">Portfolio</td><td>{data.portfolio_url or '—'}</td></tr>
                      <tr><td style="color:#64748b;">Resume</td><td>{data.resume_url or '—'}</td></tr>
                      <tr><td style="color:#64748b;">Current location</td><td>{data.current_location or '—'}</td></tr>
                      <tr><td style="color:#64748b;">Current company</td><td>{data.current_company or '—'}</td></tr>
                      <tr><td style="color:#64748b;">Notice period</td><td>{data.notice_period or '—'}</td></tr>
                      <tr><td style="color:#64748b;">Current CTC</td><td>{data.current_ctc_lpa or '—'} LPA</td></tr>
                      <tr><td style="color:#64748b;">Expected CTC</td><td>{data.expected_ctc_lpa or '—'} LPA</td></tr>
                      <tr><td style="color:#64748b;">Work mode</td><td>{data.preferred_work_mode or '—'}</td></tr>
                      <tr><td style="color:#64748b;">Primary skills</td><td>{data.primary_skills or '—'}</td></tr>
                    </table>
                    <h3 style="margin:24px 0 8px 0;font-size:15px;">Introduction</h3>
                    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;white-space:pre-wrap;">{(data.introduction or '—')}</p>
                    <p style="margin:24px 0 0 0;color:#94a3b8;font-size:12px;">Application ID: {app_id}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


@app.post("/api/applications", response_model=Application)
async def submit_application(payload: ApplicationCreate, request: Request) -> Application:
    validate_application_payload(payload)
    rate_limit_key = f"application:{client_ip(request)}:{payload.email.lower()}"
    if not application_limiter.allow(rate_limit_key):
        raise HTTPException(status_code=429, detail="Too many application attempts. Please retry shortly.")

    app_id = new_id()
    doc = {
        "id": app_id,
        "full_name": payload.full_name,
        "email": payload.email,
        "phone": payload.phone,
        "years_experience": payload.years_experience,
        "position_id": payload.position_id,
        "position_title": payload.position_title,
        "portfolio_url": payload.portfolio_url,
        "resume_url": payload.resume_url,
        "current_location": payload.current_location,
        "current_company": payload.current_company,
        "notice_period": payload.notice_period,
        "current_ctc_lpa": payload.current_ctc_lpa,
        "expected_ctc_lpa": payload.expected_ctc_lpa,
        "preferred_work_mode": payload.preferred_work_mode,
        "primary_skills": payload.primary_skills,
        "introduction": payload.introduction or "",
        "status": "pending",
        "applied_ago": "just now",
        "created_at": now_iso(),
    }
    await applications_col.insert_one(dict(doc))  # copy to avoid _id mutation side-effect

    # Ensure the candidate exists for dashboard views
    await candidates_col.update_one(
        {"email": payload.email},
        {
            "$setOnInsert": {
                "id": new_id(),
                "email": payload.email,
                "name": payload.full_name,
                "role_label": "Job Candidate",
                "phone": payload.phone,
                "portfolio_url": payload.portfolio_url,
                "resume_uploaded": False,
                "profile_complete_percent": 40,
                "profile_checklist": {
                    "basic_info": True,
                    "work_preference": False,
                    "portfolio_url": bool(payload.portfolio_url),
                    "resume_uploaded": False,
                },
                "created_at": now_iso(),
            }
        },
        upsert=True,
    )

    await activities_col.insert_one(
        {
            "id": new_id(),
            "candidate_email": payload.email,
            "title": f"Application submitted for {payload.position_title}",
            "timestamp_label": "just now",
            "color": "blue",
            "created_at": now_iso(),
        }
    )

    # Fire-and-forget email (non-blocking, graceful on missing key)
    asyncio.create_task(
        send_email_async(
            subject=f"New application: {payload.position_title} — {payload.full_name}",
            html=application_email_html(payload, app_id),
        )
    )

    return Application(**doc)


@app.get("/api/applications", response_model=List[Application])
async def list_applications(request: Request, email: Optional[EmailStr] = None) -> List[Application]:
    if email is None:
        require_admin_key(request)

    query: dict = {}
    if email:
        query["email"] = email
    docs = (
        await applications_col.find(query, {"_id": 0})
        .sort("created_at", -1)
        .to_list(length=500)
    )
    return [Application(**d) for d in docs]


# ---- Contact messages -----------------------------------------------------
def contact_email_html(data: ContactCreate, msg_id: str) -> str:
    return f"""
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#0a192f;padding:24px 28px;">
                    <div style="color:#ffffff;font-size:18px;font-weight:700;">Company Private Limited</div>
                    <div style="color:#94a3b8;font-size:12px;margin-top:4px;">New contact message</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 16px 0;font-size:20px;">Subject: {data.subject}</h2>
                    <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;font-size:14px;">
                      <tr><td style="color:#64748b;width:120px;">From</td><td><strong>{data.name}</strong></td></tr>
                      <tr><td style="color:#64748b;">Email</td><td>{data.email}</td></tr>
                      <tr><td style="color:#64748b;">Company</td><td>{data.company or '—'}</td></tr>
                      <tr><td style="color:#64748b;">Budget</td><td>{data.budget_range or '—'}</td></tr>
                      <tr><td style="color:#64748b;">Timeline</td><td>{data.timeline or '—'}</td></tr>
                    </table>
                    <h3 style="margin:24px 0 8px 0;font-size:15px;">Message</h3>
                    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;white-space:pre-wrap;">{data.message}</p>
                    <p style="margin:24px 0 0 0;color:#94a3b8;font-size:12px;">Message ID: {msg_id}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """


@app.post("/api/contact", response_model=ContactMessage)
async def submit_contact(payload: ContactCreate, request: Request) -> ContactMessage:
    rate_limit_key = f"contact:{client_ip(request)}:{payload.email.lower()}"
    if not contact_limiter.allow(rate_limit_key):
        raise HTTPException(status_code=429, detail="Too many messages. Please retry after a short wait.")

    msg_id = new_id()
    doc = {
        "id": msg_id,
        "name": payload.name,
        "email": payload.email,
        "subject": payload.subject,
        "company": payload.company,
        "budget_range": payload.budget_range,
        "timeline": payload.timeline,
        "message": payload.message,
        "created_at": now_iso(),
    }
    await contacts_col.insert_one(dict(doc))

    asyncio.create_task(
        send_email_async(
            subject=f"[Contact] {payload.subject} — {payload.name}",
            html=contact_email_html(payload, msg_id),
        )
    )
    return ContactMessage(**doc)


@app.get("/api/contact", response_model=List[ContactMessage])
async def list_contacts(request: Request) -> List[ContactMessage]:
    require_admin_key(request)

    docs = (
        await contacts_col.find({}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(length=200)
    )
    return [ContactMessage(**d) for d in docs]


# ---- Candidate dashboard --------------------------------------------------
@app.get("/api/candidates/{email}", response_model=Candidate)
async def get_candidate(email: EmailStr) -> Candidate:
    doc = await candidates_col.find_one({"email": email}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return Candidate(**doc)


@app.get("/api/dashboard/{email}", response_model=DashboardResponse)
async def get_dashboard(email: EmailStr) -> DashboardResponse:
    candidate_doc = await candidates_col.find_one({"email": email}, {"_id": 0})
    if not candidate_doc:
        raise HTTPException(status_code=404, detail="Candidate not found")

    applications_docs = (
        await applications_col.find({"email": email}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(length=200)
    )
    activity_docs = (
        await activities_col.find({"candidate_email": email}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(length=20)
    )

    interviews_scheduled = sum(1 for a in applications_docs if a.get("status") == "interview")

    stats = DashboardStats(
        applications_sent=len(applications_docs),
        applications_delta_week=min(len(applications_docs), 2),
        interviews_scheduled=interviews_scheduled,
        next_interview="Mon 10am" if interviews_scheduled else None,
        profile_views=18,
        profile_views_delta_week=5,
        profile_complete_percent=candidate_doc.get("profile_complete_percent", 40),
    )

    return DashboardResponse(
        candidate=Candidate(**candidate_doc),
        stats=stats,
        applications=[Application(**a) for a in applications_docs],
        activity=[Activity(**a) for a in activity_docs],
        unread_messages=3,
    )


@app.get("/")
async def root() -> dict:
    return {"service": "company-api", "docs": "/docs"}
