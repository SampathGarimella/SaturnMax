import {
  buildSafeCandidateUserData,
  buildUserPreferencesUpdate,
  isCanonicalRole,
  isValidAccountNumber,
  isValidIfsc,
  isValidIndianMobile,
  normalizeUserPreferences,
  resolveRoleDocument,
} from "../validators";
import { ROLE_STATUS, ROLES } from "../constants";

describe("role validators", () => {
  test("accepts only canonical roles", () => {
    expect(isCanonicalRole(ROLES.CANDIDATE)).toBe(true);
    expect(isCanonicalRole(ROLES.ADMIN)).toBe(true);
    expect(isCanonicalRole("owner")).toBe(false);
    expect(isCanonicalRole(undefined)).toBe(false);
  });

  test("resolves missing and invalid role documents without candidate fallback", () => {
    expect(resolveRoleDocument(null)).toMatchObject({
      role: null,
      status: ROLE_STATUS.UNKNOWN,
    });
    expect(resolveRoleDocument({ role: "owner" })).toMatchObject({
      role: null,
      status: ROLE_STATUS.UNKNOWN,
    });
    expect(resolveRoleDocument({ role: ROLES.EMPLOYEE })).toMatchObject({
      role: ROLES.EMPLOYEE,
      status: ROLE_STATUS.READY,
    });
  });

  test("preserves existing privileged role in candidate profile merge", () => {
    const merged = buildSafeCandidateUserData(
      { role: ROLES.ADMIN, email: "admin@saturnmax.com", name: "Admin", status: "active" },
      { role: ROLES.CANDIDATE, email: "candidate@saturnmax.com", name: "Candidate" }
    );
    expect(merged.role).toBe(ROLES.ADMIN);
    expect(merged.status).toBe("active");
    expect(merged.email).toBe("candidate@saturnmax.com");
  });
});

describe("profile field validators", () => {
  test("validates India mobile, IFSC, and bank account formats", () => {
    expect(isValidIndianMobile("+91 9876543210")).toBe(true);
    expect(isValidIndianMobile("12345")).toBe(false);
    expect(isValidIfsc("HDFC0001234")).toBe(true);
    expect(isValidIfsc("bad-ifsc")).toBe(false);
    expect(isValidAccountNumber("123456789012")).toBe(true);
    expect(isValidAccountNumber("1234")).toBe(false);
  });
});

describe("settings preference mappers", () => {
  test("normalizes stored preferences with safe defaults", () => {
    expect(
      normalizeUserPreferences({
        notificationPreferences: { weeklyDigest: true, unknown: true },
        uiPreferences: { theme: "dark" },
      })
    ).toEqual({
      notificationPreferences: {
        applicationUpdates: true,
        newRoles: true,
        recruiterMessages: true,
        weeklyDigest: true,
      },
      uiPreferences: { theme: "light" },
    });
  });

  test("merges settings updates without dropping existing preferences", () => {
    const update = buildUserPreferencesUpdate(
      {
        notificationPreferences: { applicationUpdates: false, weeklyDigest: true },
        uiPreferences: { theme: "system" },
      },
      { notificationPreferences: { recruiterMessages: false } }
    );
    expect(update.notificationPreferences).toMatchObject({
      applicationUpdates: false,
      recruiterMessages: false,
      weeklyDigest: true,
    });
    expect(update.uiPreferences.theme).toBe("system");
  });
});
