"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldCheck } from "lucide-react";

export default function TesterOnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const campaign = params.get("campaign");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [devices, setDevices] = useState("");
  const [browsers, setBrowsers] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true); setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?next=/testing/onboarding${campaign ? `?campaign=${campaign}` : ""}`); return; }
    const { error } = await supabase.from("testing_testers").upsert({ profile_id: user.id, experience_level: experienceLevel, devices: devices.trim() || null, browsers: browsers.trim() || null, bio: bio.trim() || null, status: "active" });
    if (error) { setError(error.message); setSaving(false); return; }
    router.push(campaign ? `/testing/${campaign}` : "/testing");
  }

  return <main className="max-w-lg mx-auto px-4 py-6 space-y-5"><section><div className="flex items-center gap-2 text-green-700 text-sm font-medium"><ShieldCheck className="h-4 w-4" /> Tester profile</div><h1 className="text-2xl font-bold mt-2">Set up your testing profile</h1><p className="text-sm text-gray-500 mt-1">Give campaign managers enough context to match you with useful tests.</p></section><section className="rounded-xl border bg-white p-4 space-y-4"><div><label className="text-sm font-medium">Experience</label><select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className="w-full mt-1 rounded-lg border px-3 py-2.5 text-sm"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="experienced">Experienced</option></select></div><div><label className="text-sm font-medium">Devices</label><input value={devices} onChange={e => setDevices(e.target.value)} placeholder="e.g. Samsung Galaxy A52, Android 14" className="w-full mt-1 rounded-lg border px-3 py-2.5 text-sm" /></div><div><label className="text-sm font-medium">Browsers</label><input value={browsers} onChange={e => setBrowsers(e.target.value)} placeholder="e.g. Chrome, Samsung Internet, Firefox" className="w-full mt-1 rounded-lg border px-3 py-2.5 text-sm" /></div><div><label className="text-sm font-medium">About your testing</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="What apps or websites have you tested? What are you good at spotting?" className="w-full mt-1 rounded-lg border px-3 py-2.5 text-sm" /></div>{error && <p className="text-sm text-red-600">{error}</p>}<button onClick={save} disabled={saving} className="w-full rounded-lg bg-green-700 text-white py-2.5 font-medium disabled:opacity-60 flex justify-center items-center gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save tester profile</button></section></main>;
}
