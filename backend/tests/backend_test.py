"""Saturn Max Technologies backend API tests.

Covers:
- /api/health (RESEND key blank -> email_configured=false)
- Jobs list / detail / 404
- Applications POST/GET (graceful email fallback)
- Contact POST/GET
- Candidate + Dashboard endpoints (seeded rahul@email.com)
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL_FOR_TEST"].rstrip("/") if os.environ.get(
    "REACT_APP_BACKEND_URL_FOR_TEST"
) else None

# fallback: read from frontend/.env
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

SEED_EMAIL = "rahul@email.com"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# --- Health ---
class TestHealth:
    def test_health_ok_email_not_configured(self, s):
        r = s.get(f"{BASE_URL}/api/health", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["email_configured"] is False  # RESEND_API_KEY intentionally blank
        assert data["email_provider"] == "resend"


# --- Jobs ---
class TestJobs:
    def test_list_jobs_returns_5_seeded(self, s):
        r = s.get(f"{BASE_URL}/api/jobs", timeout=20)
        assert r.status_code == 200
        jobs = r.json()
        assert isinstance(jobs, list)
        assert len(jobs) == 5
        titles = " ".join(j["title"] for j in jobs)
        assert "Full Stack" in titles
        assert "AI/ML" in titles
        assert "DevOps" in titles
        assert "Data Engineer" in titles
        assert "Sales Partner" in titles

    def test_get_job_by_id(self, s):
        r = s.get(f"{BASE_URL}/api/jobs/job-ai-ml", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "job-ai-ml"
        assert data["is_hot"] is True

    def test_get_job_404(self, s):
        r = s.get(f"{BASE_URL}/api/jobs/does-not-exist", timeout=20)
        assert r.status_code == 404


# --- Applications ---
class TestApplications:
    def test_post_application_success_without_resend_key(self, s):
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "TEST Applicant",
            "email": unique_email,
            "phone": "+1 555 111 2222",
            "years_experience": "3-5",
            "position_id": "job-fullstack-senior",
            "position_title": "Senior Full Stack Developer",
            "portfolio_url": "https://example.com/x",
            "introduction": "Hi, I'd like to apply.",
        }
        r = s.post(f"{BASE_URL}/api/applications", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "pending"
        assert data["email"] == unique_email
        assert data["position_title"] == payload["position_title"]
        assert "id" in data

        # GET filtered by email -> should contain this app
        r2 = s.get(f"{BASE_URL}/api/applications", params={"email": unique_email}, timeout=20)
        assert r2.status_code == 200
        apps = r2.json()
        assert any(a["id"] == data["id"] for a in apps)

        # Candidate auto-created
        r3 = s.get(f"{BASE_URL}/api/candidates/{unique_email}", timeout=20)
        assert r3.status_code == 200
        assert r3.json()["email"] == unique_email

    def test_post_application_invalid_email_422(self, s):
        payload = {
            "full_name": "X",
            "email": "not-an-email",
            "phone": "+1",
            "years_experience": "1",
            "position_title": "Test",
        }
        r = s.post(f"{BASE_URL}/api/applications", json=payload, timeout=20)
        assert r.status_code == 422

    def test_list_applications_for_seed(self, s):
        r = s.get(f"{BASE_URL}/api/applications", params={"email": SEED_EMAIL}, timeout=20)
        assert r.status_code == 200
        apps = r.json()
        assert len(apps) >= 4


# --- Contact ---
class TestContact:
    def test_post_contact_success(self, s):
        payload = {
            "name": "TEST Contact",
            "email": f"TEST_{uuid.uuid4().hex[:8]}@example.com",
            "subject": "Partnership",
            "message": "Hello, want to collaborate.",
        }
        r = s.post(f"{BASE_URL}/api/contact", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["subject"] == "Partnership"
        assert data["email"] == payload["email"]
        assert "id" in data

    def test_list_contacts(self, s):
        r = s.get(f"{BASE_URL}/api/contact", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --- Dashboard / Candidate ---
class TestDashboard:
    def test_dashboard_for_seed_candidate(self, s):
        r = s.get(f"{BASE_URL}/api/dashboard/{SEED_EMAIL}", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["candidate"]["email"] == SEED_EMAIL
        assert data["candidate"]["name"] == "Rahul Sharma"
        assert data["stats"]["applications_sent"] == 4
        assert data["stats"]["interviews_scheduled"] == 1
        assert data["stats"]["profile_views"] == 18
        assert data["stats"]["profile_complete_percent"] == 72
        assert len(data["applications"]) == 4
        assert len(data["activity"]) == 5
        assert data["unread_messages"] == 3

    def test_candidate_profile_checklist(self, s):
        r = s.get(f"{BASE_URL}/api/candidates/{SEED_EMAIL}", timeout=20)
        assert r.status_code == 200
        cand = r.json()
        cl = cand["profile_checklist"]
        assert cl["basic_info"] is True
        assert cl["work_preference"] is True
        assert cl["portfolio_url"] is False
        assert cl["resume_uploaded"] is False

    def test_dashboard_unknown_email_404(self, s):
        r = s.get(f"{BASE_URL}/api/dashboard/unknown-x@example.com", timeout=20)
        assert r.status_code == 404
