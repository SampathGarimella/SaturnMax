import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Sparkles,
  Users,
  Cloud,
  BarChart3,
  Bot,
  Compass,
  Handshake,
  Rocket,
  Phone,
  Mail,
  MapPin,
  Clock,
  Check,
  Building2,
  ClipboardCheck,
  FileText,
  IndianRupee,
  ShieldCheck,
  Target,
  UploadCloud,
} from "lucide-react";
import Logo from "../components/Logo";
import LoginMenu from "../components/LoginMenu";
import { fetchJobs, markResumeUploaded, submitApplication, submitContact } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const SERVICE_ICONS = {
  "Consultants on contract": Handshake,
  "Dedicated dev squads": Users,
  "AI & agent automation": Bot,
  "Fractional CTO": Compass,
  "Cloud cost optimization": Cloud,
  "Data engineering": BarChart3,
};

const SERVICES = [
  {
    title: "Consultants on contract",
    blurb:
      "Place vetted senior engineers on your team on 3–12 month contracts. Scale up or down on demand.",
    tag: { label: "Flagship offer", color: "bg-blue-50 text-blue-700" },
  },
  {
    title: "Dedicated dev squads",
    blurb:
      "2–5 person teams embedded in your product org on long-term contracts.",
    tag: { label: "Steady demand", color: "bg-emerald-50 text-emerald-700" },
  },
  {
    title: "AI & agent automation",
    blurb: "LLM integrations, AI agents, RAG pipelines for your workflows.",
    tag: { label: "Hottest now", color: "bg-amber-50 text-amber-700" },
  },
  {
    title: "Fractional CTO",
    blurb:
      "Senior tech leadership for US startups on a flexible retainer model.",
    tag: { label: "High margin", color: "bg-violet-50 text-violet-700" },
  },
  {
    title: "Cloud cost optimization",
    blurb:
      "AWS/GCP/Azure FinOps audits. Cut your cloud bill by 30–50%.",
    tag: { label: "Quick ROI", color: "bg-sky-50 text-sky-700" },
  },
  {
    title: "Data engineering",
    blurb: "Modern data stack — dbt, Snowflake, Databricks pipelines.",
    tag: { label: "Emerging", color: "bg-rose-50 text-rose-700" },
  },
];

const STEPS = [
  {
    n: "01",
    title: "Discovery call",
    blurb: "Free 30-min call with our US advisor.",
    Icon: Phone,
  },
  {
    n: "02",
    title: "Paid pilot",
    blurb: "$3–5k scoped 2-week engagement.",
    Icon: Rocket,
  },
  {
    n: "03",
    title: "Team match",
    blurb: "We assign your dedicated engineers.",
    Icon: Handshake,
  },
  {
    n: "04",
    title: "Ongoing delivery",
    blurb: "Weekly demos, Slack async, US-aligned.",
    Icon: Clock,
  },
];

const CASE_STUDIES = [
  {
    client: "US SaaS platform",
    result: "Launched an AI support workflow in 21 days",
    detail:
      "A two-person SaturnMax Technologies Pvt Ltd squad connected product docs, CRM data, and ticket history into a RAG assistant for customer workflows.",
  },
  {
    client: "Fintech data team",
    result: "Reduced cloud data spend by 34%",
    detail:
      "We audited warehouse usage, rebuilt dbt models, and added cost guardrails without slowing analyst delivery.",
  },
  {
    client: "Healthcare services group",
    result: "Staffed a React + Python team in 48 hours",
    detail:
      "Senior engineers joined an existing US roadmap with weekly demos, overlap hours, and delivery reporting.",
  },
];

const DELIVERY_PROMISES = [
  "US morning overlap with India evening delivery",
  "Senior technical screening before every placement",
  "Weekly demos, written status updates, and clear ownership",
  "Start with a scoped pilot before committing to a team",
];

const APPLICATION_STEPS = [
  "Candidate login / profile",
  "Resume and CTC details",
  "HR screening",
  "Technical interview",
  "Client discussion",
  "Offer and onboarding",
];

const NOTICE_PERIODS = [
  "Immediate",
  "15 days",
  "30 days",
  "45 days",
  "60 days",
  "90 days",
  "Serving notice",
];

const WORK_MODES = ["Remote", "Hybrid", "On-site", "Flexible"];

const TAG_STYLES = {
  "Full-time": "bg-slate-100 text-slate-700",
  Remote: "bg-emerald-50 text-emerald-700",
  "Remote USA": "bg-emerald-50 text-emerald-700",
  Hybrid: "bg-sky-50 text-sky-700",
  Contract: "bg-violet-50 text-violet-700",
  Freelance: "bg-violet-50 text-violet-700",
  "Hot role": "bg-amber-50 text-amber-700",
  Urgent: "bg-rose-50 text-rose-700",
  "15% commission": "bg-amber-50 text-amber-700",
  "US project": "bg-blue-50 text-blue-700",
};

const EXPERIENCE_TAG_RE = /yrs?\s*exp|Any exp/i;

function tagClass(tag) {
  if (TAG_STYLES[tag]) return TAG_STYLES[tag];
  if (EXPERIENCE_TAG_RE.test(tag)) return "bg-slate-50 text-slate-600";
  return "bg-slate-100 text-slate-700";
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState("");
  const [applicationForm, setApplicationForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    years_experience: "0–1",
    position_title: "",
    portfolio_url: "",
    resume_url: "",
    current_location: "",
    current_company: "",
    notice_period: "30 days",
    current_ctc_lpa: "",
    expected_ctc_lpa: "",
    preferred_work_mode: "Remote",
    primary_skills: "",
    introduction: "",
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    company: "",
    subject: "I want to hire a dev team",
    budget_range: "$10k-$25k",
    timeline: "This month",
    message: "",
  });
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    fetchJobs()
      .then((data) => {
        setJobs(data);
        if (data.length) {
          setSelectedJob(data[0].id);
          setApplicationForm((f) => ({
            ...f,
            position_title: data[0].title,
          }));
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Couldn't load open positions. Please refresh.");
      })
      .finally(() => setJobsLoading(false));
  }, []);

  const handleApplyToJob = (job) => {
    setSelectedJob(job.id);
    setApplicationForm((f) => ({ ...f, position_title: job.title }));
    document
      .getElementById("apply-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectPosition = (e) => {
    const id = e.target.value;
    setSelectedJob(id);
    const job = jobs.find((j) => j.id === id);
    if (job) {
      setApplicationForm((f) => ({ ...f, position_title: job.title }));
    }
  };

  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    if (!user?.email) {
      toast.error("Please login as a candidate before applying.");
      navigate("/login");
      return;
    }
    if (user.role && user.role !== "candidate") {
      toast.error("Please use a candidate account to apply for jobs.");
      return;
    }
    if (!applicationForm.full_name || !applicationForm.email || !applicationForm.phone) {
      toast.error("Please fill in name, email, and phone.");
      return;
    }
    if (!selectedJob || !applicationForm.position_title) {
      toast.error("Please choose an open position.");
      return;
    }
    if (!resumeFile) {
      toast.error("Please upload your resume before applying.");
      return;
    }
    setApplicationLoading(true);
    try {
      const resume = await markResumeUploaded({ file: resumeFile, candidateUid: user.uid });
      await submitApplication({
        ...applicationForm,
        resume_url: resume.file_url,
        position_id: selectedJob || null,
      });
      toast.success(
        "Application submitted! We'll reach out at " + applicationForm.email
      );
      setApplicationForm((f) => ({
        ...f,
        full_name: "",
        phone: "",
        portfolio_url: "",
        resume_url: "",
        current_location: "",
        current_company: "",
        notice_period: "30 days",
        current_ctc_lpa: "",
        expected_ctc_lpa: "",
        preferred_work_mode: "Remote",
        primary_skills: "",
        introduction: "",
      }));
      setResumeFile(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err?.message || "Submission failed. Try again.");
    } finally {
      setApplicationLoading(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      await submitContact(contactForm);
      toast.success("Message sent. Our team will reply within 24h.");
      setContactForm({
        name: "",
        email: "",
        company: "",
        subject: "I want to hire a dev team",
        budget_range: "$10k-$25k",
        timeline: "This month",
        message: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || err?.message || "Send failed. Try again.");
    } finally {
      setContactLoading(false);
    }
  };

  const handleTopSignOut = async () => {
    await signOut();
    toast.success("Signed out.");
  };

  return (
    <div className="app-shell bg-white">
      {/* ---- Header --------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 min-h-16 py-2 flex items-center justify-between gap-3">
          <Logo className="min-w-0" />
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm text-slate-600">
            <a href="#services" className="link-underline hover:text-slate-900" data-testid="nav-services">
              Services
            </a>
            <a href="#proof" className="link-underline hover:text-slate-900" data-testid="nav-proof">
              Proof
            </a>
            <a href="#careers" className="link-underline hover:text-slate-900" data-testid="nav-careers">
              Careers
            </a>
            <a href="#how" className="link-underline hover:text-slate-900" data-testid="nav-how">
              How it works
            </a>
            <a href="#contact" className="link-underline hover:text-slate-900" data-testid="nav-contact">
              Contact
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <LoginMenu />
            {user?.uid && (
              <button
                onClick={handleTopSignOut}
                className="hidden sm:inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                data-testid="top-signout-button"
              >
                Sign out
              </button>
            )}
            <a
              href="#contact"
              className="hidden sm:inline-flex h-10 items-center gap-2 rounded-md bg-[#0A192F] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e2445]"
              data-testid="nav-book-call"
            >
              <span className="hidden md:inline">Book a free call</span>
              <span className="md:hidden">Contact</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ---- Hero ----------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,#EEF4FF_0%,#FFFFFF_60%)]" />
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
          <div className="stagger text-center max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              US–India IT consulting & contract staffing
            </span>
            <h1 className="mt-6 font-heading text-5xl md:text-7xl font-bold tracking-tighter leading-[1.02] text-slate-900">
              World-class tech teams for{" "}
              <span className="text-[#2563EB]">US businesses</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed">
              Dedicated dev squads, AI automation, and vetted consultants on
              contract — delivered from India at a fraction of the cost.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#contact"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] sm:w-auto"
                data-testid="hero-discovery-cta"
              >
                Start a free discovery call
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#careers"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 sm:w-auto"
                data-testid="hero-view-positions"
              >
                View open positions
              </a>
            </div>

          </div>

          {/* metric strip */}
          <div
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            data-testid="hero-metrics"
          >
            {[
              { v: "3x", l: "Cost savings vs US hiring" },
              { v: "48hr", l: "Pilot kickoff time" },
              { v: "10+", l: "Projects delivered" },
              { v: "20+", l: "Consultants placed with clients", accent: true },
            ].map((m, i) => (
              <div
                key={m.l}
                className={`p-6 md:p-8 text-center ${
                  i < 3 ? "md:border-r md:border-slate-200" : ""
                } ${i < 2 ? "border-b md:border-b-0 border-slate-200" : ""}`}
              >
                <div
                  className={`font-heading text-3xl md:text-4xl font-bold tracking-tight ${
                    m.accent ? "text-[#2563EB]" : "text-slate-900"
                  }`}
                >
                  {m.v}
                </div>
                <div className="mt-1 text-xs text-slate-500">{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Services ------------------------------------------------- */}
      <section id="services" className="py-20 md:py-28 bg-slate-50/50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="mb-12">
            <div className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
              What we do
            </div>
            <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
              Services built for the future
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s) => {
              const Icon = SERVICE_ICONS[s.title] || Sparkles;
              return (
                <div
                  key={s.title}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-7 hover:border-[#2563EB]/30 hover:shadow-lg transition-all"
                  data-testid={`service-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB] mb-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {s.blurb}
                  </p>
                  <div
                    className={`mt-5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.tag.color}`}
                  >
                    {s.tag.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- Proof / Credibility ------------------------------------- */}
      <section id="proof" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-start">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
                Why SaturnMax Technologies Pvt Ltd
              </div>
              <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
                India-based engineering with US-ready operating rhythm
              </h2>
              <p className="mt-5 text-base text-slate-600 leading-relaxed">
                We combine vetted senior talent, practical delivery governance,
                and clear commercial pilots so US teams can scale without adding
                hiring drag or permanent overhead.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DELIVERY_PROMISES.map((promise) => (
                  <div
                    key={promise}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-sm text-slate-700 leading-snug">{promise}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {CASE_STUDIES.map((item) => (
                <article
                  key={item.client}
                  className="rounded-lg border border-slate-200 bg-white p-6 hover:border-[#2563EB]/30 hover:shadow-md transition-all"
                  data-testid={`case-study-${item.client.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-bold text-[#2563EB]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {item.client}
                  </div>
                  <h3 className="mt-3 font-heading text-xl font-semibold text-slate-900">
                    {item.result}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Careers / Open positions -------------------------------- */}
      <section id="careers" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="mb-10">
            <div className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
              Careers
            </div>
            <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
              Open positions at SaturnMax Technologies Pvt Ltd
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200 bg-white">
            {jobsLoading && (
              <div className="p-8 text-center text-slate-500 text-sm">
                Loading roles…
              </div>
            )}
            {!jobsLoading && jobs.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                No open roles are published right now. Please check back soon or contact careers@saturnmaxtech.com.
              </div>
            )}
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5 hover:bg-slate-50/60 transition-colors"
                data-testid={`job-row-${job.id}`}
              >
                <div>
                  <h3 className="font-heading text-lg md:text-xl font-semibold text-slate-900">
                    {job.title}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tagClass(
                          tag
                        )}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleApplyToJob(job)}
                  className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 transition-colors hover:border-[#0A192F] hover:bg-[#0A192F] hover:text-white md:w-auto"
                  data-testid={`job-apply-${job.id}`}
                >
                  Apply now
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Application form ---------------------------------------- */}
      <section id="apply-section" className="py-20 md:py-28 bg-slate-50/50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="mb-10 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 items-end">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
                Application process
              </div>
              <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
                Apply with a complete India tech profile
              </h2>
              <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
                Login before applying to track status, interviews, documents, and offer updates.
                The form captures the details Indian tech recruiters usually need for screening.
              </p>
              <Link
                to="/login"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0A192F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0e2445]"
              >
                Login to track applications
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ClipboardCheck className="h-4 w-4 text-[#2563EB]" />
                Hiring flow
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {APPLICATION_STEPS.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2563EB] text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleApplicationSubmit}
            className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 md:p-10 shadow-sm"
            data-testid="application-form"
          >
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-950">
              <div className="font-semibold">Candidate profile</div>
              <p className="mt-1 text-xs leading-relaxed text-blue-900/80">
                Share your latest resume and profile links so the hiring team can
                review your profile quickly.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Full name">
                <input
                  required
                  value={applicationForm.full_name}
                  onChange={(e) =>
                    setApplicationForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  placeholder="Rahul Sharma"
                  className={inputClass}
                  data-testid="application-full-name"
                />
              </Field>
              <Field label="Email address">
                <input
                  type="email"
                  required
                  value={applicationForm.email}
                  onChange={(e) =>
                    setApplicationForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="rahul@email.com"
                  className={inputClass}
                  data-testid="application-email"
                />
              </Field>
              <Field label="Phone number">
                <input
                  required
                  value={applicationForm.phone}
                  onChange={(e) =>
                    setApplicationForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="Mobile number"
                  className={inputClass}
                  data-testid="application-phone"
                />
              </Field>
              <Field label="Current location">
                <input
                  value={applicationForm.current_location}
                  onChange={(e) =>
                    setApplicationForm((f) => ({ ...f, current_location: e.target.value }))
                  }
                  placeholder="India"
                  className={inputClass}
                  data-testid="application-current-location"
                />
              </Field>
              <Field label="Current company">
                <input
                  value={applicationForm.current_company}
                  onChange={(e) =>
                    setApplicationForm((f) => ({ ...f, current_company: e.target.value }))
                  }
                  placeholder="Company name or Fresher"
                  className={inputClass}
                  data-testid="application-current-company"
                />
              </Field>
              <Field label="Years of experience">
                <select
                  value={applicationForm.years_experience}
                  onChange={(e) =>
                    setApplicationForm((f) => ({
                      ...f,
                      years_experience: e.target.value,
                    }))
                  }
                  className={inputClass}
                  data-testid="application-experience"
                >
                  {["0-1", "1-3", "3-5", "5-8", "8+"].map((y) => (
                    <option key={y} value={y}>
                      {y} years
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Position applying for">
                <select
                  value={selectedJob}
                  onChange={handleSelectPosition}
                  className={inputClass}
                  data-testid="application-position"
                  disabled={jobs.length === 0}
                >
                  {jobs.length === 0 && <option>No published roles available</option>}
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notice period">
                <select
                  value={applicationForm.notice_period}
                  onChange={(e) =>
                    setApplicationForm((f) => ({ ...f, notice_period: e.target.value }))
                  }
                  className={inputClass}
                  data-testid="application-notice-period"
                >
                  {NOTICE_PERIODS.map((period) => (
                    <option key={period}>{period}</option>
                  ))}
                </select>
              </Field>
              <Field label="Preferred work mode">
                <select
                  value={applicationForm.preferred_work_mode}
                  onChange={(e) =>
                    setApplicationForm((f) => ({ ...f, preferred_work_mode: e.target.value }))
                  }
                  className={inputClass}
                  data-testid="application-work-mode"
                >
                  {WORK_MODES.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </Field>
              <Field label="Current CTC (LPA)">
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={applicationForm.current_ctc_lpa}
                    onChange={(e) =>
                      setApplicationForm((f) => ({ ...f, current_ctc_lpa: e.target.value }))
                    }
                    placeholder="8.5"
                    className={`${inputClass} pl-9`}
                    data-testid="application-current-ctc"
                  />
                </div>
              </Field>
              <Field label="Expected CTC (LPA)">
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={applicationForm.expected_ctc_lpa}
                    onChange={(e) =>
                      setApplicationForm((f) => ({ ...f, expected_ctc_lpa: e.target.value }))
                    }
                    placeholder="12"
                    className={`${inputClass} pl-9`}
                    data-testid="application-expected-ctc"
                  />
                </div>
              </Field>
              <Field label="LinkedIn / Portfolio URL">
                <input
                  value={applicationForm.portfolio_url}
                  onChange={(e) =>
                    setApplicationForm((f) => ({
                      ...f,
                      portfolio_url: e.target.value,
                    }))
                  }
                  placeholder="linkedin.com/in/yourname"
                  className={inputClass}
                  data-testid="application-portfolio"
                />
              </Field>
              <Field label="Resume">
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-700 transition-colors hover:bg-slate-50">
                  <UploadCloud className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">
                    {resumeFile ? resumeFile.name : "Upload PDF, DOC, or DOCX"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    data-testid="application-resume-file"
                  />
                </label>
              </Field>
            </div>
            <Field label="Primary skills" className="mt-5">
              <input
                value={applicationForm.primary_skills}
                onChange={(e) =>
                  setApplicationForm((f) => ({ ...f, primary_skills: e.target.value }))
                }
                placeholder="React, Node.js, AWS, Python, LLMs"
                className={inputClass}
                data-testid="application-primary-skills"
              />
            </Field>
            <Field label="Brief introduction" className="mt-5">
              <textarea
                rows={5}
                value={applicationForm.introduction}
                onChange={(e) =>
                  setApplicationForm((f) => ({
                    ...f,
                    introduction: e.target.value,
                  }))
                }
                placeholder="Tell us about your skills and why you want to join SaturnMax Technologies Pvt Ltd..."
                className={`${inputClass} resize-none`}
                data-testid="application-introduction"
              />
            </Field>
            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="max-w-2xl text-xs leading-relaxed text-slate-500">
                By applying you agree to our careers privacy policy. We'll email{" "}
                <span className="font-semibold text-slate-700">{applicationForm.email || "you"}</span>{" "}
                with next steps and show status in the candidate dashboard after login.
              </p>
              <button
                type="submit"
                disabled={applicationLoading || !user?.email}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                data-testid="application-submit"
              >
                {applicationLoading
                  ? "Submitting..."
                  : user?.email
                  ? "Submit application"
                  : "Login to apply"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ---- How it works -------------------------------------------- */}
      <section id="how" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="mb-12">
            <div className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
              How it works
            </div>
            <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
              From intro call to live team in days
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="relative bg-white border border-slate-200 rounded-2xl p-7 hover:border-[#2563EB]/30 hover:shadow-md transition-all"
                data-testid={`how-step-${step.n}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
                    {step.n}
                  </span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A192F]/5 text-[#0A192F]">
                    <step.Icon className="h-4 w-4" />
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {step.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Contact -------------------------------------------------- */}
      <section id="contact" className="py-20 md:py-28 bg-slate-50/50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="mb-12">
            <div className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
              Get in touch
            </div>
            <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
              Contact SaturnMax Technologies Pvt Ltd
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* left: offices */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7">
                <div className="text-sm font-semibold text-slate-900">
                  India headquarters
                </div>
                <div className="mt-4 space-y-4">
                  <InfoRow
                    Icon={MapPin}
                    label="Address"
                    value="SaturnMax Technologies Pvt Ltd, India"
                  />
                  <InfoRow
                    Icon={Mail}
                    label="General enquiries"
                    value="hello@saturnmaxtech.com"
                  />
                  <InfoRow
                    Icon={Mail}
                    label="Careers"
                    value="careers@saturnmaxtech.com"
                  />
                  <InfoRow
                    Icon={Mail}
                    label="US client partnerships"
                    value="us@saturnmaxtech.com"
                  />
                </div>
              </div>
            </div>

            {/* right: message form */}
            <form
              onSubmit={handleContactSubmit}
              className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7 space-y-5"
              data-testid="contact-form"
            >
              <div className="text-sm font-semibold text-slate-900">Send us a message</div>
              <Field label="Your name">
                <input
                  required
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="John Smith"
                  className={inputClass}
                  data-testid="contact-name"
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="john@company.com"
                  className={inputClass}
                  data-testid="contact-email"
                />
              </Field>
              <Field label="Company">
                <input
                  value={contactForm.company}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, company: e.target.value }))
                  }
                  placeholder="Acme Inc."
                  className={inputClass}
                  data-testid="contact-company"
                />
              </Field>
              <Field label="Subject">
                <select
                  value={contactForm.subject}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  className={inputClass}
                  data-testid="contact-subject"
                >
                  <option>I want to hire a dev team</option>
                  <option>I want to apply for a role</option>
                  <option>Sales partnership</option>
                  <option>General enquiry</option>
                </select>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Budget range">
                  <select
                    value={contactForm.budget_range}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, budget_range: e.target.value }))
                    }
                    className={inputClass}
                    data-testid="contact-budget"
                  >
                    <option>Under $10k</option>
                    <option>$10k-$25k</option>
                    <option>$25k-$75k</option>
                    <option>$75k+</option>
                    <option>Not sure yet</option>
                  </select>
                </Field>
                <Field label="Timeline">
                  <select
                    value={contactForm.timeline}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, timeline: e.target.value }))
                    }
                    className={inputClass}
                    data-testid="contact-timeline"
                  >
                    <option>This week</option>
                    <option>This month</option>
                    <option>This quarter</option>
                    <option>Exploring options</option>
                  </select>
                </Field>
              </div>
              <Field label="Message">
                <textarea
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, message: e.target.value }))
                  }
                  placeholder="Tell us what you're looking for…"
                  className={`${inputClass} resize-none`}
                  data-testid="contact-message"
                />
              </Field>
              <button
                type="submit"
                disabled={contactLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#0A192F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0e2445] transition-colors disabled:opacity-60"
                data-testid="contact-submit"
              >
                {contactLoading ? "Sending…" : "Send message"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ---- Operating model ----------------------------------------- */}
      <section className="py-16 md:py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ModelCard
              Icon={Building2}
              title="Client dashboard"
              body="Project requests, status updates, documents, and account messages are the next production dashboard track."
            />
            <ModelCard
              Icon={FileText}
              title="Admin workflow"
              body="Leads, applications, jobs, and homepage content should move into a managed admin queue."
            />
            <ModelCard
              Icon={Target}
              title="Hiring pipeline"
              body="Candidates get application status, messages, resume readiness, and interview next steps in one place."
            />
          </div>
        </div>
      </section>

      {/* ---- Footer CTA ---------------------------------------------- */}
      <section className="bg-[#0A192F] text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">
              Ready to build your US tech team?
            </h3>
            <p className="mt-2 text-sm text-white/70">
              No commitment. Just a 30-min discovery call.
            </p>
          </div>
          <a
            href="#contact"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] md:w-auto"
            data-testid="footer-cta-book-call"
          >
            Book free discovery call
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="py-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} SaturnMax Technologies Pvt Ltd · India
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="#contact" className="hover:text-slate-800">Privacy</a>
            <a href="#contact" className="hover:text-slate-800">Terms</a>
            <a href="#careers" className="hover:text-slate-800">Careers</a>
            <a href="#contact" className="hover:text-slate-800">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---- Small local components ------------------------------------------- */
const inputClass =
  "w-full h-11 rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function InfoRow({ Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2563EB]/10 text-[#2563EB]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm text-slate-900 break-words">{value}</div>
      </div>
    </div>
  );
}

function ModelCard({ Icon, title, body }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-6">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-heading text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}

// Unused but exported to allow optional check icon rendering on checklist-style cards
export { Check };
