export const consultantProfile = {
  name: "Ananya Rao",
  email: "ananya.consultant@saturnmaxtech.com",
  consultantId: "SMC-1042",
  role: "Senior Cloud Consultant",
  location: "India",
  client: "Northstar Health Systems",
  project: "AWS modernization and cost governance",
  status: "Active project",
  startDate: "May 12, 2026",
  endDate: "Nov 11, 2026",
  monthlyPay: "INR 2,40,000",
  nextPayout: "May 31, 2026",
  billableHours: 132,
  utilization: 82,
  manager: "Priya Menon",
  panStatus: "PAN verified",
  gstStatus: "Not required",
  bankStatus: "Bank verified",
};

export const consultantDocuments = [
  { name: "Consulting agreement", type: "Agreement", status: "Signed", owner: "Operations" },
  { name: "PAN card", type: "Tax", status: "Verified", owner: "Finance" },
  { name: "Aadhaar proof", type: "KYC", status: "Verified", owner: "People Ops" },
  { name: "Bank cancelled cheque", type: "Payroll", status: "Verified", owner: "Finance" },
  { name: "Client NDA", type: "Compliance", status: "Pending signature", owner: "Client success" },
];

export const consultantOnboarding = [
  { label: "Profile and KYC", done: true },
  { label: "Tax details", done: true },
  { label: "Bank payout setup", done: true },
  { label: "Client NDA", done: false },
  { label: "Project kickoff", done: false },
];

export const consultantProjectMilestones = [
  {
    title: "Infrastructure discovery",
    date: "May 15",
    status: "Complete",
    detail: "Account access, tagging audit, and cost baseline completed.",
  },
  {
    title: "Terraform migration plan",
    date: "May 24",
    status: "In progress",
    detail: "Shared VPC, EKS, IAM, and logging modules being mapped.",
  },
  {
    title: "FinOps dashboard",
    date: "Jun 07",
    status: "Queued",
    detail: "Cloud spend dashboard and budget alerts for client leadership.",
  },
];

export const employeeStats = [
  { label: "Active consultants", value: "18", delta: "+4 this month" },
  { label: "Candidates in pipeline", value: "126", delta: "32 under review" },
  { label: "Client projects", value: "7", delta: "3 onboarding" },
  { label: "Pending documents", value: "14", delta: "Needs follow-up" },
];

export const employeeCandidates = [
  {
    name: "Rahul Sharma",
    email: "rahul@email.com",
    role: "AI/ML Engineer",
    stage: "Under review",
    experience: "4 yrs",
    source: "Website application",
  },
  {
    name: "Meera Iyer",
    email: "meera.iyer@email.com",
    role: "Full Stack Developer",
    stage: "Interview",
    experience: "6 yrs",
    source: "Referral",
  },
  {
    name: "Arjun Reddy",
    email: "arjun.reddy@email.com",
    role: "Cloud DevOps Engineer",
    stage: "Shortlisted",
    experience: "5 yrs",
    source: "LinkedIn",
  },
];

export const employeeConsultants = [
  {
    name: "Ananya Rao",
    email: "ananya.consultant@saturnmaxtech.com",
    role: "Senior Cloud Consultant",
    client: "Northstar Health Systems",
    project: "AWS modernization",
    pay: "INR 2,40,000/mo",
    status: "Active",
  },
  {
    name: "Kiran Patel",
    email: "kiran.patel@saturnmaxtech.com",
    role: "Data Engineer",
    client: "Fintech analytics client",
    project: "Snowflake + dbt platform",
    pay: "INR 1,85,000/mo",
    status: "Onboarding",
  },
  {
    name: "Divya Nair",
    email: "divya.nair@saturnmaxtech.com",
    role: "React Consultant",
    client: "US SaaS platform",
    project: "Customer portal rebuild",
    pay: "INR 1,65,000/mo",
    status: "Active",
  },
];

export const employeeProjects = [
  {
    client: "Northstar Health Systems",
    owner: "Ananya Rao",
    health: "Green",
    nextStep: "Terraform migration plan review",
  },
  {
    client: "Fintech analytics client",
    owner: "Kiran Patel",
    health: "Amber",
    nextStep: "Finish client NDA and laptop readiness",
  },
  {
    client: "US SaaS platform",
    owner: "Divya Nair",
    health: "Green",
    nextStep: "Sprint review on Friday",
  },
];

export const STORAGE_KEYS = {
  manualPeople: "saturnmax:manual-people",
};
