const trim = (value, fallback) => {
  const next = String(value || "").trim();
  return next || fallback;
};

export const BRAND_NAME = trim(process.env.REACT_APP_BRAND_NAME, "Company");
export const LEGAL_NAME = trim(process.env.REACT_APP_LEGAL_NAME, `${BRAND_NAME} Private Limited`);
export const PUBLIC_DOMAIN = trim(process.env.REACT_APP_PUBLIC_DOMAIN, "example.com");
export const APP_BASE_URL = trim(process.env.REACT_APP_APP_BASE_URL, `https://${PUBLIC_DOMAIN}`);
export const SUPPORT_EMAIL = trim(process.env.REACT_APP_SUPPORT_EMAIL, `support@${PUBLIC_DOMAIN}`);
export const HR_EMAIL = trim(process.env.REACT_APP_HR_EMAIL, `hr@${PUBLIC_DOMAIN}`);
export const LINKEDIN_URL = trim(process.env.REACT_APP_LINKEDIN_URL, "https://www.linkedin.com/company/example/");
export const THEME_STORAGE_KEY = trim(process.env.REACT_APP_THEME_STORAGE_KEY, "company-dashboard-theme");
export const PENDING_APPLY_STORAGE_KEY = trim(process.env.REACT_APP_PENDING_APPLY_STORAGE_KEY, "company.pendingApplyJob");
export const APPLICATION_DRAFT_STORAGE_PREFIX = trim(
  process.env.REACT_APP_APPLICATION_DRAFT_STORAGE_PREFIX,
  "company.applicationDraft"
);

export function portalUrl(path = "/") {
  const suffix = String(path || "/").startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_URL}${suffix}`;
}
