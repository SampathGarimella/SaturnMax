import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : "";

export const BACKEND_CONFIGURED = Boolean(BACKEND_URL);

export const FALLBACK_JOBS = [
  {
    id: "job-fullstack-senior",
    title: "Senior Full Stack Developer (React + Node)",
    department: "Engineering",
    employment_type: "Full-time",
    work_mode: "Remote",
    experience: "3-6 yrs exp",
    tags: ["Full-time", "Remote", "3-6 yrs exp", "US project"],
    description:
      "Build customer-facing React + Node applications for US SaaS clients. Own features end-to-end from API design to UI polish.",
  },
  {
    id: "job-ai-ml",
    title: "AI/ML Engineer - LLM & Agentic Systems",
    department: "AI",
    employment_type: "Full-time",
    work_mode: "Remote",
    experience: "2-5 yrs exp",
    tags: ["Full-time", "Remote", "2-5 yrs exp", "Hot role"],
    description:
      "Ship LLM-powered products: RAG pipelines, agents, evals, and production integrations for US customers.",
  },
  {
    id: "job-devops",
    title: "Cloud & DevOps Engineer (AWS/GCP)",
    department: "Infrastructure",
    employment_type: "Full-time",
    work_mode: "Hybrid",
    experience: "3-7 yrs exp",
    tags: ["Full-time", "Hybrid", "3-7 yrs exp", "US project"],
    description:
      "Design, automate, and optimize cloud infrastructure with Terraform, Kubernetes, and observability.",
  },
  {
    id: "job-data-engineer",
    title: "Data Engineer (dbt, Snowflake, Python)",
    department: "Data",
    employment_type: "Contract",
    work_mode: "Remote",
    experience: "2-4 yrs exp",
    tags: ["Contract", "Remote", "2-4 yrs exp", "Urgent"],
    description:
      "Own modern data pipelines, warehouse modeling, and analytics infrastructure for US fintech and SaaS teams.",
  },
];

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export async function fetchJobs() {
  if (!BACKEND_CONFIGURED) return FALLBACK_JOBS;
  const { data } = await api.get("/jobs");
  return data;
}

export async function submitApplication(payload) {
  if (!BACKEND_CONFIGURED) {
    throw new Error("Backend is not configured yet. Please email careers@saturnmaxtech.com.");
  }
  const { data } = await api.post("/applications", payload);
  return data;
}

export async function submitContact(payload) {
  if (!BACKEND_CONFIGURED) {
    throw new Error("Backend is not configured yet. Please email us@saturnmaxtech.com.");
  }
  const { data } = await api.post("/contact", payload);
  return data;
}

export async function fetchDashboard(email) {
  if (!BACKEND_CONFIGURED) {
    throw new Error("Backend is not configured yet.");
  }
  const { data } = await api.get(`/dashboard/${encodeURIComponent(email)}`);
  return data;
}

export async function fetchApplications(email) {
  if (!BACKEND_CONFIGURED) return [];
  const params = email ? { email } : {};
  const { data } = await api.get("/applications", { params });
  return data;
}
