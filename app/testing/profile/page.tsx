"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tester = { experience_level: string; devices: string | null; browsers: string | null; bio: string | null; status: string };
type Application = { status: string; testing_campaigns?: { title: string } | null };
type Finding = { status: string; severity: string; created_at: string; reward_amount: number | null };
type Reward = { amount: number; status: string; currency: string };

export default function TesterProfilePage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<"loading" | "denied" | "allowed">("loading");
  const [tester, setTester] = useState<Tester | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAccess("denied"); setLoading(false); return; }

      const [t, a, f, r] = await Promise.all([
        supabase.from("testing_testers").select("experience_level,devices,browsers,bio,status").eq("profile_id", user.id).maybeSingle(),
        supabase.from("testing_applications").select("status,testing_campaigns(title)").eq("tester_id", user.id),
        supabase.from("testing_findings").select("status,severity,created_at,reward_amount").eq("tester_id", user.id).order("created_at", { ascending: false }),
        supabase.from("testing_rewards").select("amount,status,currency").eq("tester_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (!t.data) { setAccess("denied"); setLoading(false); return; }
      setAccess("allowed");
      setTester(t.data as Tester);
      setApplications((a.data || []) as Application[]);
      setFindings((f.data || []) as Finding[]);
      setRewards((r.data || []) as Reward[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-16 flex justify-center"><Loader2 className="animate-spin" /></main>;
  if (access === "denied" || !tester) return <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-4"><h1 className="text-2xl font-bold">Tester profile not found</h1><p className="text-sm text-gray-500">Complete tester onboarding before viewing your profile.</p><Link href="/testing/onboarding" className="inline-flex rounded-lg bg-green-700 text-white px-4 py-2 text-sm">Become a tester</Link></main>;

  const accepted = applications.filter(x => x.status === "accepted").length;
  const reviewed = findings.filter(x => ["valid", "invalid", "duplicate"].includes(x.status));
  const valid = findings.filter(x => x.status === "valid").length;
  const submitted = findings.length;
  const paid = rewards.filter(x => x.status === "paid").reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const pending = rewards.filter(x => x.status === "pending" || x.status === "approved").reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const acceptanceRate = applications.length ? Math.round((accepted / applications.length) * 100) : 0;
  const validityRate = reviewed.length ? Math.round((valid / reviewed.length) * 100) : 0;
  const reputation = Math.min(100, Math.round((valid * 8) + (accepted * 4) + (validityRate * 0.3)));

  return <main className="max-w-2xl mx-auto px-4 py-6 pb-12 space-y-5">
    <div><Link href="/testing/my" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-3"><ArrowLeft className="h-4 w-4" /> My Testing</Link><div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Tester profile</h1><p className="text-sm text-gray-500">Your crowdtesting experience and track record.</p></div><div className="rounded-full bg-green-50 border border-green-200 px-3 py-2 text-center"><div className="text-xl font-bold text-green-700">{reputation}</div><div className="text-[11px] text-green-700">Reputation</div></div></div></div>

    <section className="grid grid-cols-2 gap-3">
      <Stat label="Accepted campaigns" value={accepted} />
      <Stat label="Findings submitted" value={submitted} />
      <Stat label="Valid findings" value={valid} />
      <Stat label="Validity rate" value={`${validityRate}%`} />
      <Stat label="Paid rewards" value={`${paid.toFixed(2)} GMD`} />
      <Stat label="Pending rewards" value={`${pending.toFixed(2)} GMD`} />
    </section>

    <section className="rounded-xl border bg-white p-4 space-y-3"><h2 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4" /> Tester details</h2><div className="grid gap-3 text-sm"><Detail label="Experience" value={tester.experience_level} /><Detail label="Devices" value={tester.devices || "Not provided"} /><Detail label="Browsers" value={tester.browsers || "Not provided"} /><Detail label="Status" value={tester.status} />{tester.bio && <Detail label="Bio" value={tester.bio} />}</div></section>

    <section className="rounded-xl border bg-white p-4 space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">Recent findings</h2><span className="text-xs text-gray-500">Applications accepted: {acceptanceRate}%</span></div>{findings.slice(0, 8).map((f, i) => <div key={`${f.created_at}-${i}`} className="flex items-center justify-between gap-3 border-t pt-3 text-sm"><div><div className="font-medium">{f.severity} finding</div><div className="text-xs text-gray-500">{new Date(f.created_at).toLocaleDateString()}</div></div><div className="text-right"><div className="capitalize">{f.status.replace("_", " ")}</div>{f.reward_amount ? <div className="text-xs text-gray-500">{f.reward_amount} GMD</div> : null}</div></div>)}{findings.length === 0 && <p className="text-sm text-gray-500">No findings submitted yet. Join a campaign to start building your record.</p>}</section>

    <div className="flex gap-2"><Link href="/testing" className="rounded-lg bg-green-700 text-white px-4 py-2 text-sm">Find campaigns</Link><Link href="/testing/my" className="rounded-lg border px-4 py-2 text-sm">My testing</Link></div>
  </main>;
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border bg-white p-4"><div className="text-xl font-bold">{value}</div><div className="text-xs text-gray-500 mt-1">{label}</div></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><div className="text-xs text-gray-500">{label}</div><div className="mt-0.5 whitespace-pre-wrap">{value}</div></div>; }
