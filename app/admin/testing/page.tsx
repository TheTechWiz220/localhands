"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Plus, RefreshCw, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const input = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600";

type Tab = "overview" | "campaigns" | "applications" | "findings" | "rewards";
type Campaign = { id: string; title: string; description: string | null; status: string; tester_limit: number; reward_amount: number; currency: string; requirements: string | null; instructions: string | null; starts_at: string | null; ends_at: string | null };
type Application = { id: string; campaign_id: string; tester_id: string; status: string; message: string | null; applied_at: string; campaign?: { title: string } | null };
type Finding = { id: string; campaign_id: string; tester_id: string; title: string; finding_type: string; severity: string; reproduction_steps: string; expected_behavior: string; actual_behavior: string; device: string | null; operating_system: string | null; browser: string | null; evidence_url: string | null; status: string; reviewer_notes: string | null; reward_amount: number | null; campaign?: { title: string } | null };
type Reward = { id: string; tester_id: string; finding_id: string; amount: number; currency: string; status: string; payment_method: string | null; payment_reference: string | null; notes: string | null; finding?: { title: string } | null };

export default function AdminTestingPage() {
  const [access, setAccess] = useState<"loading" | "denied" | "allowed">("loading");
  const [tab, setTab] = useState<Tab>("overview");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [campaignForm, setCampaignForm] = useState({ title: "", description: "", tester_limit: "10", reward_amount: "0", requirements: "", instructions: "", starts_at: "", ends_at: "" });
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  async function load() {
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAccess("denied"); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") { setAccess("denied"); setLoading(false); return; }
    setAccess("allowed");
    const [c, a, f, r] = await Promise.all([
      supabase.from("testing_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("testing_applications").select("id,campaign_id,tester_id,status,message,applied_at,testing_campaigns(title)").order("applied_at", { ascending: false }),
      supabase.from("testing_findings").select("*,testing_campaigns(title)").order("created_at", { ascending: false }),
      supabase.from("testing_rewards").select("*,testing_findings(title)").order("created_at", { ascending: false }),
    ]);
    if (c.error || a.error || f.error || r.error) setError([c.error, a.error, f.error, r.error].filter(Boolean).map(x => x?.message).join(" | "));
    setCampaigns((c.data || []) as Campaign[]);
    setApplications((a.data || []).map((x: any) => ({ ...x, campaign: x.testing_campaigns })) as Application[]);
    setFindings((f.data || []).map((x: any) => ({ ...x, campaign: x.testing_campaigns })) as Finding[]);
    setRewards((r.data || []).map((x: any) => ({ ...x, finding: x.testing_findings })) as Reward[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveCampaign(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    const payload = { title: campaignForm.title.trim(), description: campaignForm.description.trim() || null, tester_limit: Number(campaignForm.tester_limit) || 10, reward_amount: Number(campaignForm.reward_amount) || 0, currency: "GMD", requirements: campaignForm.requirements.trim() || null, instructions: campaignForm.instructions.trim() || null, starts_at: campaignForm.starts_at || null, ends_at: campaignForm.ends_at || null };
    const result = editingCampaign ? await supabase.from("testing_campaigns").update(payload).eq("id", editingCampaign) : await supabase.from("testing_campaigns").insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setCampaignForm({ title: "", description: "", tester_limit: "10", reward_amount: "0", requirements: "", instructions: "", starts_at: "", ends_at: "" }); setEditingCampaign(null); setMessage("Campaign saved."); load();
  }

  function editCampaign(c: Campaign) {
    setEditingCampaign(c.id); setTab("campaigns");
    setCampaignForm({ title: c.title, description: c.description || "", tester_limit: String(c.tester_limit), reward_amount: String(c.reward_amount), requirements: c.requirements || "", instructions: c.instructions || "", starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "", ends_at: c.ends_at ? c.ends_at.slice(0, 16) : "" });
  }

  async function campaignStatus(id: string, status: string) {
    setError(""); const { error } = await supabase.from("testing_campaigns").update({ status }).eq("id", id); if (error) setError(error.message); else load();
  }

  async function applicationStatus(id: string, status: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("testing_applications").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null }).eq("id", id);
    if (error) setError(error.message); else load();
  }

  async function reviewFinding(f: Finding, status: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("testing_findings").update({ status, reviewer_id: user?.id || null, reviewed_at: new Date().toISOString() }).eq("id", f.id);
    if (error) { setError(error.message); return; }
    if (status === "valid" && (f.reward_amount || 0) > 0) {
      const existing = rewards.find(r => r.finding_id === f.id);
      if (!existing) {
        const { error: rewardError } = await supabase.from("testing_rewards").insert({ tester_id: f.tester_id, finding_id: f.id, amount: f.reward_amount, currency: "GMD", status: "pending" });
        if (rewardError) setError(rewardError.message);
      }
    }
    load();
  }

  async function rewardStatus(r: Reward, status: string) {
    const patch: Record<string, unknown> = { status };
    if (status === "approved") patch.approved_at = new Date().toISOString();
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("testing_rewards").update(patch).eq("id", r.id);
    if (error) setError(error.message); else load();
  }

  if (loading && access === "loading") return <main className="max-w-6xl mx-auto px-4 py-16 flex justify-center"><Loader2 className="animate-spin" /></main>;
  if (access === "denied") return <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-4"><h1 className="text-2xl font-bold">Access Denied</h1><Link href="/admin" className="inline-flex rounded-lg border px-4 py-2 text-sm">Back to admin</Link></main>;

  const pendingApps = applications.filter(x => x.status === "pending").length;
  const pendingFindings = findings.filter(x => x.status === "pending" || x.status === "needs_info").length;
  const pendingRewards = rewards.filter(x => x.status === "pending" || x.status === "approved").length;

  return <main className="max-w-6xl mx-auto px-4 py-6 pb-12 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-2"><ArrowLeft className="h-4 w-4" /> Admin</Link><h1 className="text-2xl font-bold">Crowdtesting</h1><p className="text-sm text-gray-500">Run campaigns, approve testers, review findings and track rewards.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
    {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{message}</div>}
    <nav className="flex gap-2 overflow-x-auto border-b">{([['overview','Overview'],['campaigns','Campaigns'],['applications',`Applications (${pendingApps})`],['findings',`Findings (${pendingFindings})`],['rewards',`Rewards (${pendingRewards})`]] as [Tab,string][]).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap px-3 py-2 text-sm border-b-2 ${tab === id ? 'border-green-700 text-green-700 font-medium' : 'border-transparent text-gray-500'}`}>{label}</button>)}</nav>

    {tab === "overview" && <section className="grid grid-cols-2 md:grid-cols-4 gap-3"><Stat label="Campaigns" value={campaigns.length} /><Stat label="Pending applications" value={pendingApps} /><Stat label="Findings to review" value={pendingFindings} /><Stat label="Rewards" value={rewards.length} /><div className="col-span-2 md:col-span-4 rounded-xl border bg-white p-4"><h2 className="font-semibold mb-2">MVP workflow</h2><p className="text-sm text-gray-600">Create a campaign → publish it → approve testers → testers complete tasks → review findings → valid findings create rewards → approve and manually pay rewards.</p></div></section>}

    {tab === "campaigns" && <section className="grid lg:grid-cols-[360px_1fr] gap-5"><form onSubmit={saveCampaign} className="rounded-xl border bg-white p-4 space-y-3"><h2 className="font-semibold">{editingCampaign ? "Edit campaign" : "Create campaign"}</h2><Field label="Title"><input required className={input} value={campaignForm.title} onChange={e => setCampaignForm({...campaignForm,title:e.target.value})} /></Field><Field label="Description"><textarea className={input} value={campaignForm.description} onChange={e => setCampaignForm({...campaignForm,description:e.target.value})} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Tester limit"><input type="number" min="1" className={input} value={campaignForm.tester_limit} onChange={e => setCampaignForm({...campaignForm,tester_limit:e.target.value})} /></Field><Field label="Reward (GMD)"><input type="number" min="0" step="0.01" className={input} value={campaignForm.reward_amount} onChange={e => setCampaignForm({...campaignForm,reward_amount:e.target.value})} /></Field></div><Field label="Requirements"><textarea className={input} value={campaignForm.requirements} onChange={e => setCampaignForm({...campaignForm,requirements:e.target.value})} placeholder="Android phone, mobile data..." /></Field><Field label="Instructions"><textarea className={input} value={campaignForm.instructions} onChange={e => setCampaignForm({...campaignForm,instructions:e.target.value})} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Starts"><input type="datetime-local" className={input} value={campaignForm.starts_at} onChange={e => setCampaignForm({...campaignForm,starts_at:e.target.value})} /></Field><Field label="Ends"><input type="datetime-local" className={input} value={campaignForm.ends_at} onChange={e => setCampaignForm({...campaignForm,ends_at:e.target.value})} /></Field></div><div className="flex gap-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-green-700 text-white px-4 py-2 text-sm disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save campaign"}</button>{editingCampaign && <button type="button" onClick={() => {setEditingCampaign(null);setCampaignForm({ title:"",description:"",tester_limit:"10",reward_amount:"0",requirements:"",instructions:"",starts_at:"",ends_at:""})}} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>}</div></form><div className="space-y-3">{campaigns.map(c => <div key={c.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{c.title}</h3><p className="text-xs text-gray-500">{c.status} · {c.reward_amount} {c.currency} · {c.tester_limit} testers</p></div><div className="flex gap-2"><button onClick={() => editCampaign(c)} className="rounded-lg border px-3 py-1.5 text-xs">Edit</button>{c.status === 'draft' && <button onClick={() => campaignStatus(c.id,'published')} className="rounded-lg bg-green-700 text-white px-3 py-1.5 text-xs">Publish</button>}{c.status === 'published' && <button onClick={() => campaignStatus(c.id,'closed')} className="rounded-lg border px-3 py-1.5 text-xs">Close</button>}{c.status === 'closed' && <button onClick={() => campaignStatus(c.id,'published')} className="rounded-lg border px-3 py-1.5 text-xs">Reopen</button>}</div></div>{c.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{c.description}</p>}</div>)}{campaigns.length===0 && <Empty text="No campaigns yet." />}</div></section>}

    {tab === "applications" && <section className="space-y-3">{applications.map(a => <div key={a.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{a.campaign?.title || a.campaign_id}</h3><p className="text-xs text-gray-500">Tester: {a.tester_id}</p><p className="text-xs text-gray-500">Applied: {new Date(a.applied_at).toLocaleString()}</p>{a.message && <p className="text-sm mt-2 whitespace-pre-wrap">{a.message}</p>}</div><div className="flex items-start gap-2"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs">{a.status}</span>{a.status === 'pending' && <><button onClick={() => applicationStatus(a.id,'accepted')} className="inline-flex items-center gap-1 rounded-lg bg-green-700 text-white px-3 py-1.5 text-xs"><Check className="h-3.5 w-3.5"/> Accept</button><button onClick={() => applicationStatus(a.id,'rejected')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs"><X className="h-3.5 w-3.5"/> Reject</button></>}</div></div></div>)}{applications.length===0 && <Empty text="No applications yet." />}</section>}

    {tab === "findings" && <section className="space-y-3">{findings.map(f => <div key={f.id} className="rounded-xl border bg-white p-4 space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{f.title}</h3><p className="text-xs text-gray-500">{f.campaign?.title || f.campaign_id} · Tester {f.tester_id}</p><p className="text-xs mt-1">{f.finding_type} · <span className="font-medium">{f.severity}</span> · {f.status}</p></div>{f.status === 'pending' || f.status === 'needs_info' ? <div className="flex gap-2"><button onClick={() => reviewFinding(f,'valid')} className="rounded-lg bg-green-700 text-white px-3 py-1.5 text-xs">Valid</button><button onClick={() => reviewFinding(f,'invalid')} className="rounded-lg border px-3 py-1.5 text-xs">Invalid</button><button onClick={() => reviewFinding(f,'duplicate')} className="rounded-lg border px-3 py-1.5 text-xs">Duplicate</button><button onClick={() => reviewFinding(f,'needs_info')} className="rounded-lg border px-3 py-1.5 text-xs">Needs info</button></div> : null}</div><div className="grid md:grid-cols-2 gap-3 text-sm"><Info label="Reproduction" value={f.reproduction_steps}/><Info label="Expected" value={f.expected_behavior}/><Info label="Actual" value={f.actual_behavior}/><Info label="Environment" value={[f.device,f.operating_system,f.browser].filter(Boolean).join(" · ") || "Not provided"}/></div>{f.evidence_url && <a href={f.evidence_url} target="_blank" rel="noreferrer" className="text-sm text-green-700 underline">Open evidence</a>}</div>)}{findings.length===0 && <Empty text="No findings yet." />}</section>}

    {tab === "rewards" && <section className="space-y-3">{rewards.map(r => <div key={r.id} className="rounded-xl border bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{r.finding?.title || r.finding_id}</h3><p className="text-xs text-gray-500">Tester: {r.tester_id} · {r.amount} {r.currency} · {r.status}</p></div><div className="flex gap-2">{r.status === 'pending' && <button onClick={() => rewardStatus(r,'approved')} className="rounded-lg bg-green-700 text-white px-3 py-1.5 text-xs">Approve</button>}{r.status === 'approved' && <button onClick={() => rewardStatus(r,'paid')} className="rounded-lg bg-green-700 text-white px-3 py-1.5 text-xs">Mark paid</button>}{(r.status === 'pending' || r.status === 'approved') && <button onClick={() => rewardStatus(r,'rejected')} className="rounded-lg border px-3 py-1.5 text-xs">Reject</button>}</div></div></div>)}{rewards.length===0 && <Empty text="No rewards yet." />}</section>}
  </main>;
}

function Stat({label,value}:{label:string;value:number}) { return <div className="rounded-xl border bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block"><span className="text-xs font-medium">{label}</span><div className="mt-1">{children}</div></label>; }
function Info({label,value}:{label:string;value:string}) { return <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-medium text-gray-500 mb-1">{label}</p><p className="whitespace-pre-wrap break-words">{value}</p></div>; }
function Empty({text}:{text:string}) { return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500"><Plus className="h-5 w-5 mx-auto mb-2" />{text}</div>; }
