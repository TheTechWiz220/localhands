"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, LogIn, Send, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Campaign { id: string; title: string; description: string | null; reward_amount: number; currency: string; tester_limit: number; requirements: string | null; instructions: string | null; starts_at: string | null; ends_at: string | null; }

export default function CampaignPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [application, setApplication] = useState<{ id: string; status: string } | null>(null);
  const [hasTesterProfile, setHasTesterProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: c } = await supabase.from("testing_campaigns").select("id,title,description,reward_amount,currency,tester_limit,requirements,instructions,starts_at,ends_at").eq("id", params.id).eq("status", "published").maybeSingle();
      setCampaign(c as Campaign | null);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: tester } = await supabase.from("testing_testers").select("profile_id").eq("profile_id", user.id).maybeSingle();
        setHasTesterProfile(!!tester);
        const { data: app } = await supabase.from("testing_applications").select("id,status").eq("campaign_id", params.id).eq("tester_id", user.id).maybeSingle();
        setApplication(app as { id: string; status: string } | null);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function apply() {
    setSubmitting(true); setNotice("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?next=/testing/${params.id}`); return; }
    if (!hasTesterProfile) { router.push(`/testing/onboarding?campaign=${params.id}`); return; }
    const { data, error } = await supabase.from("testing_applications").insert({ campaign_id: params.id, tester_id: user.id, message: message.trim() || null }).select("id,status").single();
    if (error) setNotice(error.code === "23505" ? "You have already applied to this campaign." : error.message);
    else setApplication(data as { id: string; status: string });
    setSubmitting(false);
  }

  if (loading) return <div className="max-w-lg mx-auto py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" /></div>;
  if (!campaign) return <main className="max-w-lg mx-auto px-4 py-8"><Link href="/testing" className="text-sm text-green-700 flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to campaigns</Link><div className="mt-8 rounded-xl border p-6 text-center"><p className="font-semibold">Campaign not found</p><p className="text-sm text-gray-500 mt-1">This campaign may no longer be open.</p></div></main>;

  return <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
    <Link href="/testing" className="text-sm text-green-700 flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back to campaigns</Link>
    <section className="space-y-3"><div className="flex items-center gap-2 text-xs font-medium text-green-700"><ShieldCheck className="h-4 w-4" /> Remote testing campaign</div><h1 className="text-2xl font-bold">{campaign.title}</h1><p className="text-gray-600 text-sm leading-6">{campaign.description || "Help test this product and report clear, reproducible findings."}</p></section>
    <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Reward</p><p className="font-bold text-green-700 mt-1">{campaign.currency} {Number(campaign.reward_amount || 0).toLocaleString()}</p><p className="text-xs text-gray-400">per valid finding</p></div><div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">Testers</p><p className="font-bold mt-1 flex items-center gap-1"><Users className="h-4 w-4" /> {campaign.tester_limit}</p><p className="text-xs text-gray-400">maximum</p></div></div>
    {(campaign.starts_at || campaign.ends_at) && <div className="rounded-xl border bg-white p-4 text-sm flex items-start gap-2"><CalendarDays className="h-4 w-4 mt-0.5 text-gray-500" /><div>{campaign.starts_at && <p>Starts {new Date(campaign.starts_at).toLocaleString("en-GB")}</p>}{campaign.ends_at && <p className="text-gray-500">Ends {new Date(campaign.ends_at).toLocaleString("en-GB")}</p>}</div></div>}
    {campaign.requirements && <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Requirements</h2><p className="text-sm text-gray-600 whitespace-pre-wrap mt-2 leading-6">{campaign.requirements}</p></section>}
    {campaign.instructions && <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">What you will test</h2><p className="text-sm text-gray-600 whitespace-pre-wrap mt-2 leading-6">{campaign.instructions}</p></section>}
    {application ? <div className="rounded-xl border border-green-200 bg-green-50 p-4"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-green-600" /> Application {application.status}</div><p className="text-sm text-gray-600 mt-1">We’ll update your access when the campaign manager reviews your application.</p></div> : <section className="rounded-xl border bg-white p-4 space-y-3"><h2 className="font-semibold">Apply to test</h2><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Tell the campaign manager about your device, testing experience, or anything relevant..." className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />{notice && <p className="text-sm text-red-600">{notice}</p>}<button onClick={apply} disabled={submitting} className="w-full rounded-lg bg-green-700 text-white py-2.5 font-medium flex items-center justify-center gap-2 disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Apply to Test</button><p className="text-xs text-gray-400 text-center">You’ll need a LocalHands tester profile to apply.</p></section>}
  </main>;
}
