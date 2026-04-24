import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export async function fetchJobs() {
  const { data } = await api.get("/jobs");
  return data;
}

export async function submitApplication(payload) {
  const { data } = await api.post("/applications", payload);
  return data;
}

export async function submitContact(payload) {
  const { data } = await api.post("/contact", payload);
  return data;
}

export async function fetchDashboard(email) {
  const { data } = await api.get(`/dashboard/${encodeURIComponent(email)}`);
  return data;
}

export async function fetchApplications(email) {
  const params = email ? { email } : {};
  const { data } = await api.get("/applications", { params });
  return data;
}
