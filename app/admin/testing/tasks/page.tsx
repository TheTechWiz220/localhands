"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Loader2, Plus, Save, ToggleLeft, ToggleRight, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const input = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600";
type Campaign = { id: string; title: string; status: string };
type Task = { id: string; campaign_id: string; title: string; description: string | null; expected_behavior: string | null; sort_order: number; active: boolean };

const emptyForm = { title: "", description: "", expected_behavior: "", sort_order: "1" };

export default function AdminTestingTasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const [access, setAccess] = useState<"loading" | "denied" | "allowed">("loading");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAccess("denied"); setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") { setAccess("denied"); setLoading(false); return; }
    setAccess("allowed");
    const [{ data: campaignData, error: campaignError }, { data: taskData, error: taskError }] = await Promise.all([
      supabase.from("testing_campaigns").select("id,title,status").order("created_at", { ascending: false }),
      supabase.from("testing_tasks").select("id,campaign_id,title,description,expected_behavior,sort_order,active").order("sort_order", { ascending: true }),
    ]);
    if (campaignError || taskError) setError([campaignError, taskError].filter(Boolean).map(x => x?.message).join(" | "));
    setCampaigns(campaignData || []); setTasks(taskData || []);
    if (!campaignId && campaignData?.[0]) setCampaignId(campaignData[0].id);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(task: Task) {
    setCampaignId(task.campaign_id); setEditing(task.id);
    setForm({ title: task.title, description: task.description || "", expected_behavior: task.expected_behavior || "", sort_order: String(task.sort_order) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() { setEditing(null); setForm(emptyForm); }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    if (!campaignId) { setError("Select a campaign first."); setSaving(false); return; }
    const payload = { campaign_id: campaignId, title: form.title.trim(), description: form.description.trim() || null, expected_behavior: form.expected_behavior.trim() || null, sort_order: Number(form.sort_order) || 1, active: true };
    const result = editing
      ? await supabase.from("testing_tasks").update(payload).eq("id", editing)
      : await supabase.from("testing_tasks").insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setMessage(editing ? "Task updated." : "Task added."); cancelEdit(); load();
  }

  async function toggleTask(task: Task) {
    setError("");
    const { error: updateError } = await supabase.from("testing_tasks").update({ active: !task.active }).eq("id", task.id);
    if (updateError) setError(updateError.message); else load();
  }

  const visibleTasks = tasks.filter(t => t.campaign_id === campaignId).sort((a, b) => a.sort_order - b.sort_order);
  const selectedCampaign = campaigns.find(c => c.id === campaignId);

  if (loading && access === "loading") return <main className="max-w-5xl mx-auto px-4 py-16 flex justify-center"><Loader2 className="animate-spin" /></main>;
  if (access === "denied") return <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-4"><h1 className="text-2xl font-bold">Access Denied</h1><Link href="/admin/testing" className="inline-flex rounded-lg border px-4 py-2 text-sm">Back to crowdtesting</Link></main>;

  return <main className="max-w-5xl mx-auto px-4 py-6 pb-12 space-y-6">
    <div><Link href="/admin/testing" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-2"><ArrowLeft className="h-4 w-4" /> Crowdtesting</Link><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Task management</h1><p className="text-sm text-gray-500">Build the checklist testers will use for each campaign.</p></div><Link href="/admin/testing" className="rounded-lg border px-3 py-2 text-sm">Admin dashboard</Link></div></div>
    {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">{message}</div>}
    <section className="grid lg:grid-cols-[360px_1fr] gap-5 items-start">
      <form onSubmit={saveTask} className="rounded-xl border bg-white p-4 space-y-3 lg:sticky lg:top-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">{editing ? "Edit task" : "Add task"}</h2>{editing && <button type="button" onClick={cancelEdit} className="text-gray-500"><X className="h-4 w-4" /></button>}</div>
        <label className="block"><span className="text-xs font-medium">Campaign</span><select required className={input + " mt-1"} value={campaignId} onChange={e => { setCampaignId(e.target.value); if (editing) cancelEdit(); }}><option value="">Select campaign</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.title} ({c.status})</option>)}</select></label>
        <label className="block"><span className="text-xs font-medium">Task title</span><input required className={input + " mt-1"} value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Register an account" /></label>
        <label className="block"><span className="text-xs font-medium">Description</span><textarea className={input + " mt-1 min-h-20"} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="What should the tester do?" /></label>
        <label className="block"><span className="text-xs font-medium">Expected behavior</span><textarea className={input + " mt-1 min-h-20"} value={form.expected_behavior} onChange={e => setForm({...form,expected_behavior:e.target.value})} placeholder="What should happen?" /></label>
        <label className="block"><span className="text-xs font-medium">Order</span><input type="number" min="1" className={input + " mt-1"} value={form.sort_order} onChange={e => setForm({...form,sort_order:e.target.value})} /></label>
        <button disabled={saving || !campaignId} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 text-white py-2.5 text-sm disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : editing ? "Update task" : "Add task"}</button>
      </form>
      <section className="space-y-3">
        <div className="rounded-xl border bg-gray-50 p-4"><p className="text-xs text-gray-500">Selected campaign</p><p className="font-semibold mt-1">{selectedCampaign?.title || "Select a campaign"}</p><p className="text-xs text-gray-500 mt-1">{visibleTasks.length} task{visibleTasks.length === 1 ? "" : "s"}</p></div>
        {visibleTasks.map((task, index) => <article key={task.id} className={`rounded-xl border bg-white p-4 ${!task.active ? "opacity-60" : ""}`}><div className="flex gap-3"><div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">{index + 1}</div><div className="flex-1 min-w-0"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{task.title}</h3><p className="text-xs text-gray-500">Order {task.sort_order} · {task.active ? "Active" : "Inactive"}</p></div><div className="flex gap-1"><button type="button" onClick={() => startEdit(task)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs"><Edit3 className="h-3.5 w-3.5" /> Edit</button><button type="button" onClick={() => toggleTask(task)} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs">{task.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}{task.active ? "Disable" : "Enable"}</button></div></div>{task.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{task.description}</p>}{task.expected_behavior && <p className="text-xs text-gray-500 mt-2"><span className="font-medium">Expected:</span> {task.expected_behavior}</p>}</div></div></article>)}
        {campaignId && visibleTasks.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500"><Plus className="h-5 w-5 mx-auto mb-2" />No tasks yet. Add the first task for this campaign.</div>}
      </section>
    </section>
  </main>;
}
