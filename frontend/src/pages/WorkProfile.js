import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, UserCog } from "lucide-react";
import { SectionHeader, LoadingState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fetchOwnUserProfile, updateOwnUserProfile } from "../lib/api";

const EMPTY_PROFILE = {
  name: "",
  email: "",
  phone: "",
  title: "",
  department: "",
  location: "",
  bio: "",
};

export default function WorkProfile({ portal = "employee" }) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isConsultant = portal === "consultant";

  useEffect(() => {
    let ignore = false;
    if (!user?.uid) return undefined;
    setLoading(true);
    fetchOwnUserProfile(user.uid)
      .then((profile) => {
        if (ignore) return;
        setForm({
          name: profile.name || user.name || "",
          email: profile.email || user.email || "",
          phone: profile.phone || "",
          title: profile.title || profile.roleTitle || profile.role || "",
          department: profile.department || "",
          location: profile.location || profile.workLocation || "",
          bio: profile.bio || profile.notes || "",
        });
      })
      .catch((err) => toast.error(err?.message || "Could not load profile."))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateOwnUserProfile({ ...form, role: user.role });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err?.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading profile..." />;

  return (
    <div className="space-y-5" data-testid={`${portal}-work-profile-page`}>
      <SectionHeader
        eyebrow={isConsultant ? "Consultant profile" : "Work profile"}
        title={isConsultant ? "Edit consultant profile" : "Edit employee profile"}
        description="Update contact and work details used across the portal."
      />

      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
            <UserCog className="h-5 w-5" />
          </span>
          <div>
            <div className="font-heading text-lg font-semibold text-slate-900">{form.name || "Profile"}</div>
            <div className="text-xs text-slate-500">{form.email || user?.email}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Full name"><input className={inputClass} value={form.name} onChange={(e) => update("name", e.target.value)} /></Field>
          <Field label="Email"><input className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
          <Field label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
          <Field label={isConsultant ? "Role title" : "Job title"}><input className={inputClass} value={form.title} onChange={(e) => update("title", e.target.value)} /></Field>
          {!isConsultant && (
            <Field label="Department"><input className={inputClass} value={form.department} onChange={(e) => update("department", e.target.value)} /></Field>
          )}
          <Field label="Location"><input className={inputClass} value={form.location} onChange={(e) => update("location", e.target.value)} /></Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea className={`${inputClass} h-28 resize-none py-3`} value={form.bio} onChange={(e) => update("bio", e.target.value)} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2563EB] px-5 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent";

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
