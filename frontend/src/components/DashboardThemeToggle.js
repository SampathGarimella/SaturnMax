import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function getStoredDashboardTheme() {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem("saturnmax-dashboard-theme") || "light";
}

export default function DashboardThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getStoredDashboardTheme);

  useEffect(() => {
    document.documentElement.dataset.dashboardTheme = theme;
    window.localStorage.setItem("saturnmax-dashboard-theme", theme);
  }, [theme]);

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${className}`}
      aria-label={dark ? "Switch to light dashboard" : "Switch to dark dashboard"}
    >
      {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
