"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ClipboardCheck, Coins, Loader2, ShieldCheck, UserCircle } from "lucide-react";

type Application = { id: string; status: string; campaign_id: string; testing_campaigns: { title: string; reward_amount: number; currency: string; ends_at: string | null } | null };
type Reward = { id: string; amount: number; currency: string; status: string };

export default function MyTestingPage() {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { (async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login?next=/testing/my"); return; }
    const { data: tester } = await supabase.from("testing_testers").select("profile_id").eq("profile_id", user.id).maybeSingle();
    if (!tester) { router.push("/testing/onboarding"); return; }
    const { data: applications, error: appError } = await supabase.from("testing_applications").select("id,status,campaign_id,testing_campaigns(title,reward_amount,currency,ends_at)").eq("tester_id", user.id).order("applied_at", { ascending: false });
    const { data: rewardData, error: rewardError } = await supabase.from("testing_rewards").select("id,amount,currency,status").eq("tester_id", user.id).order("created_at", { ascending: false });
    if (appError || rewardError) setError((appError || rewardError)?.message || "Could not load testing workspace.");
    setApps((applications as Application[]) || []); setRewards((rewardData as Reward[]) || []); setLoading(false);
  })(); }, [router]);

  if (loading) return <main className="max-w-lg mx-auto px-4 py-12 flex justify-center"><Loader2 className="animate-spin" /></main>;
  return <main className="max-w-lg mx-auto px-4 py-6 space-y-6"><section><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-green-700 text-sm font-medium"><ShieldCheck className="h-4 w-4" /> My Testing</div><h1 className="text-2xl font-bold mt-2">Your tester workspace</h1><p className="text-sm text-gray-500 mt-1">Track campaigns, accepted tests and rewards.</p></div><Link href="/testing/profile" aria-label="Tester profile" className="rounded-full border p-2 text-gray-600 hover:text-green-700"><UserCircle className="h-6 w-6" /></Link></div></section>{error && <p className="text-sm text-red-600">{error}</p>}<section className="space-y-3"><h2 className="font-semibold">Campaigns</h2>{apps.length === 0 ? <div className="rounded-xl border p-5 text-sm text-gray-500">You have not applied to any campaigns yet.<Link href="/testing" className="block mt-2 text-green-700 font-medium">Browse testing campaigns →</Link></div> : apps.map(app => <div key={app.id} className="rounded-xl border bg-white p-4"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{app.testing_campaigns?.title || "Testing campaign"}</h3><p className="text-sm text-gray-500 mt-1">{app.testing_campaigns?.reward_amount} {app.testing_campaigns?.currency || "GMD"} per accepted finding</p></div><span className="text-xs rounded-full bg-gray-100 px-2 py-1 h-fit capitalize">{app.status}</span></div>{app.status === "accepted" && <Link href={`/testing/${app.campaign_id}/tasks`} className="mt-4 block text-center rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium">Open test tasks</Link>}</div>)}</section><section className="space-y-3"><div className="flex items-center gap-2"><Coins className="h-4 w-4" /><h2 className="font-semibold">Rewards</h2></div>{rewards.length === 0 ? <p className="text-sm text-gray-500">No rewards yet. Submit valid findings from an accepted campaign.</p> : <div className="space-y-2">{rewards.map(r => <div key={r.id} className="rounded-lg border p-3 flex justify-between"><span>{r.amount} {r.currency}</span><span className="text-sm capitalize text-gray-500">{r.status}</span></div>)}</div>}</section><Link href="/testing" className="block text-center text-sm text-gray-600">← Browse all campaigns</Link></main>;
}