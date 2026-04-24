import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  Sparkles,
  Users,
  Cloud,
  BarChart3,
  ShieldCheck,
  Bot,
  Compass,
  Handshake,
  Rocket,
  Phone,
  Mail,
  MapPin,
  Clock,
  Check,
} from "lucide-react";
import Logo from "../components/Logo";
import { fetchJobs, submitApplication, submitContact } from "../lib/api";

const SERVICE_ICONS = {
  "AI & agent automation": Bot,
  "Dedicated dev squads": Users,
  "Fractional CTO": Compass,
  "Cloud cost optimization": Cloud,
  "Data engineering": BarChart3,
  "Cybersecurity & compliance": ShieldCheck,
};

const SERVICES = [
  {
    title: "AI & agent automation",
    blurb: "LLM integrations, AI agents, RAG pipelines for your workflows.",
    tag: { label: "Hottest now", color: "bg-blue-50 text-blue-700" },
  },
  {
    title: "Dedicated dev squads",
    blurb:
      "2–5 person teams embedded in your product org on long-term contracts.",
    tag: { label: "Steady demand", color: "bg-emerald-50 text-emerald-700" },
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
    tag: { label: "Quick ROI", color: "bg-amber-50 text-amber-700" },
  },
  {
    title: "Data engineering",
    blurb: "Modern data stack — dbt, Snowflake, Databricks pipelines.",
    tag: { label: "Emerging", color: "bg-rose-50 text-rose-700" },
  },
  {
    title: "Cybersecurity & compliance",
    blurb:
      "SOC 2, HIPAA, PCI readiness for US-regulated businesses.",
    tag: { label: "Niche premium", color: "bg-sky-50 text-sky-700" },
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
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [applicationForm, setApplicationForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    years_experience: "0–1",
    position_title: "",
    portfolio_url: "",
    introduction: "",
  });
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "I want to hire a dev team",
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
      });
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
    if (!applicationForm.full_name || !applicationForm.email || !applicationForm.phone) {
      toast.error("Please fill in name, email and phone.");
      return;
    }
    setApplicationLoading(true);
    try {
      await submitApplication({
        ...applicationForm,
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
        introduction: "",
      }));
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Submission failed. Try again.");
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
        subject: "I want to hire a dev team",
        message: "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Send failed. Try again.");
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="app-shell bg-white">
      {/* ---- Header --------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#services" className="link-underline hover:text-slate-900" data-testid="nav-services">
              Services
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
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden md:inline-flex items-center px-4 py-2 text-sm text-slate-700 hover:text-slate-900 font-medium"
              data-testid="nav-login-link"
            >
              Candidate login
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-md bg-[#0A192F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0e2445] transition-colors shadow-sm"
              data-testid="nav-book-call"
            >
              Book a free call
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
              US-India IT Consulting · Est. 2024
            </span>
            <h1 className="mt-6 font-heading text-5xl md:text-7xl font-bold tracking-tighter leading-[1.02] text-slate-900">
              World-class tech teams for{" "}
              <span className="text-[#2563EB]">US businesses</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed">
              AI automation, cloud engineering, and dedicated dev squads —
              delivered from India at a fraction of the cost.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors shadow-sm"
                data-testid="hero-discovery-cta"
              >
                Start a free discovery call
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#careers"
                className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                data-testid="hero-view-positions"
              >
                View open positions
              </a>
            </div>

            {/* trusted by */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm">
              <span className="text-[11px] tracking-[0.2em] uppercase text-slate-400">
                Trusted by teams at
              </span>
              {["Acme Corp", "Buildfast", "Stackly", "NovaHQ"].map((brand) => (
                <span
                  key={brand}
                  className="font-heading font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {brand}
                </span>
              ))}
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
              { v: "US LLC", l: "USD contracts ready", accent: true },
              { v: "50+", l: "Projects delivered" },
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

      {/* ---- Careers / Open positions -------------------------------- */}
      <section id="careers" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="mb-10">
            <div className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
              Careers
            </div>
            <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
              Open positions at Saturn Max
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200 bg-white">
            {jobs.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                Loading roles…
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
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-[#0A192F] hover:text-white hover:border-[#0A192F] transition-colors inline-flex items-center gap-2"
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
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <div className="mb-10">
            <div className="text-xs tracking-[0.2em] uppercase text-[#2563EB] font-bold">
              Register
            </div>
            <h2 className="mt-3 font-heading text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">
              Apply for a position
            </h2>
          </div>

          <form
            onSubmit={handleApplicationSubmit}
            className="bg-white rounded-2xl border border-slate-200 p-6 md:p-10 shadow-sm"
            data-testid="application-form"
          >
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
                  placeholder="+91 98765 43210"
                  className={inputClass}
                  data-testid="application-phone"
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
                  {["0–1", "1–3", "3–5", "5–8", "8+"].map((y) => (
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
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
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
            </div>
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
                placeholder="Tell us about your skills and why you want to join Saturn Max…"
                className={`${inputClass} resize-none`}
                data-testid="application-introduction"
              />
            </Field>
            <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-slate-500">
                By applying you agree to our careers privacy policy. We'll email{" "}
                <span className="font-semibold text-slate-700">{applicationForm.email || "you"}</span>{" "}
                with next steps.
              </p>
              <button
                type="submit"
                disabled={applicationLoading}
                className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="application-submit"
              >
                {applicationLoading ? "Submitting…" : "Submit application"}
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
              Contact Saturn Max
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
                    value="Saturn Max Technologies Pvt Ltd, Bangalore, Karnataka, India"
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
              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7">
                <div className="text-sm font-semibold text-slate-900">
                  US office (Delaware LLC)
                </div>
                <div className="mt-4 space-y-4">
                  <InfoRow Icon={Phone} label="US enquiries" value="+1 (302) 555-0199" />
                  <InfoRow
                    Icon={Clock}
                    label="Working hours (IST)"
                    value="Mon–Fri, 6pm–10pm IST (US EST morning overlap)"
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

      {/* ---- Footer CTA ---------------------------------------------- */}
      <section className="bg-[#0A192F] text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">
              Ready to build your US tech team?
            </h3>
            <p className="mt-2 text-sm text-white/70">
              No commitment. Just a 30-min call with our advisor.
            </p>
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors shadow-sm"
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
            © {new Date().getFullYear()} Saturn Max Technologies Pvt Ltd · Bangalore, India
          </div>
          <div className="flex items-center gap-6">
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

// Unused but exported to allow optional check icon rendering on checklist-style cards
export { Check };
