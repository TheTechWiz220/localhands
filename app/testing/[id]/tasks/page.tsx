"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";

type Task = { id: string; title: string; description: string | null; expected_behavior: string | null; sort_order: number; active: boolean };

export default function CampaignTasksPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaignTitle, setCampaignTitle] = useState("Testing campaign");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { (async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/auth/login?next=/testing/${id}/tasks`); return; }
    const { data: application } = await supabase.from("testing_applications").select("status").eq("campaign_id", id).eq("tester_id", user.id).maybeSingle();
    if (!application || application.status !== "accepted") { router.push(`/testing/${id}`); return; }
    const [{ data: campaign }, { data: taskData }, { data: findings }] = await Promise.all([
      supabase.from("testing_campaigns").select("title").eq("id", id).single(),
      supabase.from("testing_tasks").select("id,title,description,expected_behavior,sort_order,active").eq("campaign_id", id).eq("active", true).order("sort_order"),
      supabase.from("testing_findings").select("task_id").eq("campaign_id", id).eq("tester_id", user.id).not("task_id", "is", null),
    ]);
    if (campaign) setCampaignTitle(campaign.title);
    setTasks(taskData || []); setSubmitted((findings || []).map(f => f.task_id)); setLoading(false);
  })(); }, [id, router]);

  if (loading) return <main className="max-w-lg mx-auto px-4 py-12 flex justify-center"><Loader2 className="animate-spin" /></main>;
  return <main className="max-w-lg mx-auto px-4 py-6 space-y-5"><Link href="/testing/my" className="inline-flex items-center gap-1 text-sm text-gray-600"><ArrowLeft className="h-4 w-4" /> My Testing</Link><section><div className="flex items-center gap-2 text-green-700 text-sm font-medium"><ClipboardList className="h-4 w-4" /> Test tasks</div><h1 className="text-2xl font-bold mt-2">{campaignTitle}</h1><p className="text-sm text-gray-500 mt-1">Work through each task and report anything unexpected.</p></section>{error && <p className="text-sm text-red-600">{error}</p>}{tasks.length === 0 ? <div className="rounded-xl border p-5 text-sm text-gray-500">No tasks have been published for this campaign yet.</div> : <div className="space-y-3">{tasks.map((task, index) => { const done = submitted.includes(task.id); return <div key={task.id} className="rounded-xl border bg-white p-4"><div className="flex gap-3"><div className="text-sm font-bold text-gray-400">{index + 1}</div><div className="flex-1"><div className="flex justify-between gap-2"><h2 className="font-semibold">{task.title}</h2>{done && <CheckCircle2 className="h-5 w-5 text-green-600" />}</div>{task.description && <p className="text-sm text-gray-600 mt-2">{task.description}</p>}{task.expected_behavior && <p className="text-xs text-gray-500 mt-2"><span className="font-medium">Expected:</span> {task.expected_behavior}</p>}<Link href={`/testing/${id}/submit?task=${task.id}`} className="mt-4 block text-center rounded-lg border border-green-700 text-green-700 py-2.5 text-sm font-medium">{done ? "Report another finding" : "Test & report finding"}</Link></div></div></div>; })}</div>}<Link href={`/testing/${id}`} className="block text-center text-sm text-gray-600">View campaign details</Link></main>;
}
