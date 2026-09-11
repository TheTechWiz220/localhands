"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Send } from "lucide-react";

const inputClass = "w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-600";

export default function SubmitFindingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [title, setTitle] = useState("");
  const [findingType, setFindingType] = useState("bug");
  const [severity, setSeverity] = useState("medium");
  const [taskId, setTaskId] = useState(searchParams.get("task") || "");
  const [reproductionSteps, setReproductionSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [device, setDevice] = useState("");
  const [os, setOs] = useState("");
  const [browser, setBrowser] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => { (async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?next=/testing/${id}/submit`); return; }
    const { data: application } = await supabase.from("testing_applications").select("status").eq("campaign_id", id).eq("tester_id", user.id).maybeSingle();
    if (!application || application.status !== "accepted") { router.push(`/testing/${id}`); return; }
    const { data } = await supabase.from("testing_tasks").select("id,title").eq("campaign_id", id).eq("active", true).order("sort_order");
    setTasks(data || []); setLoading(false);
  })(); }, [id, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!title.trim() || !reproductionSteps.trim() || !expected.trim() || !actual.trim()) {
      setError("Please complete the finding title, reproduction steps, expected behavior, and actual behavior."); return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?next=/testing/${id}/submit`); return; }
    const { error: insertError } = await supabase.from("testing_findings").insert({
      campaign_id: id, tester_id: user.id, task_id: taskId || null,
      title: title.trim(), finding_type: findingType, severity,
      reproduction_steps: reproductionSteps.trim(), expected_behavior: expected.trim(), actual_behavior: actual.trim(),
      device: device.trim() || null, os: os.trim() || null, browser: browser.trim() || null,
      evidence_url: evidenceUrl.trim() || null,
    });
    setSubmitting(false);
    if (insertError) { setError(insertError.message); return; }
    setSuccess(true);
  }

  if (loading) return <main className="max-w-lg mx-auto px-4 py-12 flex justify-center"><Loader2 className="animate-spin" /></main>;
  if (success) return <main className="max-w-lg mx-auto px-4 py-10 text-center space-y-4"><div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-green-700"><Send /></div><h1 className="text-2xl font-bold">Finding submitted</h1><p className="text-sm text-gray-600">Your finding is pending review. If it is validated, the admin can approve a reward for it.</p><div className="flex gap-2 justify-center"><Link href={`/testing/${id}/tasks`} className="rounded-lg border px-4 py-2 text-sm">Back to tasks</Link><Link href="/testing/my" className="rounded-lg bg-green-700 text-white px-4 py-2 text-sm">My testing</Link></div></main>;

  return <main className="max-w-lg mx-auto px-4 py-6 pb-10 space-y-5"><Link href={`/testing/${id}/tasks`} className="inline-flex items-center gap-1 text-sm text-gray-600"><ArrowLeft className="h-4 w-4" /> Tasks</Link><section><h1 className="text-2xl font-bold">Submit a finding</h1><p className="text-sm text-gray-500 mt-1">Be specific. Clear reproduction steps make findings easier to validate.</p></section>{error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}<form onSubmit={submit} className="space-y-4"><label className="block"><span className="text-sm font-medium">Task</span><select className={inputClass + " mt-1"} value={taskId} onChange={e => setTaskId(e.target.value)}><option value="">General finding</option>{tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label><label className="block"><span className="text-sm font-medium">Finding title *</span><input className={inputClass + " mt-1"} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Login button does not respond" /></label><div className="grid grid-cols-2 gap-3"><label><span className="text-sm font-medium">Type</span><select className={inputClass + " mt-1"} value={findingType} onChange={e => setFindingType(e.target.value)}><option value="bug">Bug</option><option value="usability">Usability</option><option value="ux">UX</option><option value="performance">Performance</option><option value="compatibility">Compatibility</option><option value="other">Other</option></select></label><label><span className="text-sm font-medium">Severity</span><select className={inputClass + " mt-1"} value={severity} onChange={e => setSeverity(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label></div><label className="block"><span className="text-sm font-medium">Reproduction steps *</span><textarea className={inputClass + " mt-1 min-h-28"} value={reproductionSteps} onChange={e => setReproductionSteps(e.target.value)} placeholder="1. Open...\n2. Tap...\n3. Enter...\n4. Observe..." /></label><label className="block"><span className="text-sm font-medium">Expected behavior *</span><textarea className={inputClass + " mt-1 min-h-20"} value={expected} onChange={e => setExpected(e.target.value)} /></label><label className="block"><span className="text-sm font-medium">Actual behavior *</span><textarea className={inputClass + " mt-1 min-h-20"} value={actual} onChange={e => setActual(e.target.value)} /></label><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><label><span className="text-sm font-medium">Device</span><input className={inputClass + " mt-1"} value={device} onChange={e => setDevice(e.target.value)} placeholder="Galaxy A52" /></label><label><span className="text-sm font-medium">OS</span><input className={inputClass + " mt-1"} value={os} onChange={e => setOs(e.target.value)} placeholder="Android 14" /></label><label><span className="text-sm font-medium">Browser</span><input className={inputClass + " mt-1"} value={browser} onChange={e => setBrowser(e.target.value)} placeholder="Chrome" /></label></div><label className="block"><span className="text-sm font-medium">Evidence URL</span><input type="url" className={inputClass + " mt-1"} value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://..." /><span className="text-xs text-gray-500 mt-1 block">MVP accepts a link to a screenshot, video, or other evidence.</span></label><button disabled={submitting} className="w-full rounded-lg bg-green-700 text-white py-3 font-medium disabled:opacity-60">{submitting ? "Submitting..." : "Submit finding"}</button></form></main>;
}
