"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, Loader2, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Campaign = {
  id: string;
  title: string;
  brief: string;
  checklist: string;
  status: string;
  max_slots: number;
  deadline: string | null;
  campaign_price: number | null;
  tester_reward: number;
  created_at: string;
};

type AssignmentRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  status: string;
  claimed_at: string;
  submitted_at: string | null;
  profiles?: { full_name: string | null } | null;
};

type ReportRow = {
  id: string;
  assignment_id: string;
  what_tried: string;
  expected: string | null;
  actual: string | null;
  severity: string;
  device: string | null;
  created_at: string;
};

export default function AdminTestingPage() {
  const supabase = createClient();
  const [access, setAccess] = useState<"loading" | "denied" | "allowed">(
    "loading"
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [checklist, setChecklist] = useState("");
  const [maxSlots, setMaxSlots] = useState(10);
  const [testerReward, setTesterReward] = useState(0);
  const [campaignPrice, setCampaignPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAccess("denied");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      setAccess("denied");
      return;
    }
    setAccess("allowed");

    const { data: camps } = await supabase
      .from("test_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns((camps as Campaign[]) || []);

    const { data: assigns } = await supabase
      .from("test_assignments")
      .select("id, campaign_id, user_id, status, claimed_at, submitted_at")
      .order("claimed_at", { ascending: false });

    // attach names
    const rows = (assigns as AssignmentRow[]) || [];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    let nameMap: Record<string, string | null> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      (profs || []).forEach((p: { id: string; full_name: string | null }) => {
        nameMap[p.id] = p.full_name;
      });
    }
    setAssignments(
      rows.map((r) => ({
        ...r,
        profiles: { full_name: nameMap[r.user_id] ?? null },
      }))
    );

    const { data: reps } = await supabase
      .from("test_reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports((reps as ReportRow[]) || []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createCampaign() {
    if (!title.trim() || !brief.trim()) {
      setMsg("Title and brief required");
      return;
    }
    setSaving(true);
    setMsg(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("test_campaigns").insert({
      title: title.trim(),
      brief: brief.trim(),
      checklist: checklist.trim(),
      max_slots: maxSlots,
      tester_reward: testerReward,
      campaign_price: campaignPrice || null,
      status: "draft",
      created_by: user?.id,
    });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setTitle("");
    setBrief("");
    setChecklist("");
    setMsg("Campaign created as draft");
    await load();
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase
      .from("test_campaigns")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setMsg(error.message);
    else await load();
  }

  async function setAssignmentStatus(id: string, status: string) {
    const { error } = await supabase
      .from("test_assignments")
      .update({ status })
      .eq("id", id);
    if (error) setMsg(error.message);
    else {
      setMsg(`Marked ${status}`);
      await load();
    }
  }

  if (access === "loading") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-3">
        <Lock className="h-10 w-10 mx-auto text-red-500" />
        <p className="font-semibold">Access denied</p>
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
      </div>
    );
  }

  const filteredAssigns = selectedCampaign
    ? assignments.filter((a) => a.campaign_id === selectedCampaign)
    : assignments;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin" className="text-gray-500 hover:text-green-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-green-700" />
          Testing admin
        </h1>
      </div>

      {msg && (
        <p className="text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          {msg}
        </p>
      )}

      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="font-semibold text-sm">New campaign</h2>
        <input
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[70px]"
          placeholder="Brief for testers"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[70px]"
          placeholder="Checklist (one step per line)"
          value={checklist}
          onChange={(e) => setChecklist(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-gray-600">
            Slots
            <input
              type="number"
              className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
              value={maxSlots}
              onChange={(e) => setMaxSlots(Number(e.target.value) || 1)}
            />
          </label>
          <label className="text-xs text-gray-600">
            Tester reward (GMD)
            <input
              type="number"
              className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
              value={testerReward}
              onChange={(e) => setTesterReward(Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-xs text-gray-600">
            Campaign price (admin)
            <input
              type="number"
              className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
              value={campaignPrice}
              onChange={(e) => setCampaignPrice(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <p className="text-[11px] text-gray-400">
          Campaign price is admin-only. Testers only see their reward.
        </p>
        <Button onClick={createCampaign} disabled={saving}>
          {saving ? "Saving…" : "Create draft"}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm">Campaigns</h2>
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-xl border bg-white p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{c.title}</p>
                <p className="text-xs text-gray-500">
                  {c.status} · reward {c.tester_reward} GMD
                  {c.campaign_price != null
                    ? ` · price ${c.campaign_price} GMD`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-green-700 underline"
                onClick={() =>
                  setSelectedCampaign(
                    selectedCampaign === c.id ? null : c.id
                  )
                }
              >
                {selectedCampaign === c.id ? "Hide" : "Review"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.status !== "open" && (
                <Button size="sm" onClick={() => setStatus(c.id, "open")}>
                  Open
                </Button>
              )}
              {c.status === "open" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus(c.id, "closed")}
                >
                  Close
                </Button>
              )}
              {c.status !== "draft" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setStatus(c.id, "draft")}
                >
                  Draft
                </Button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm">
          Assignments & reports
          {selectedCampaign ? " (filtered)" : ""}
        </h2>
        {filteredAssigns.length === 0 && (
          <p className="text-sm text-gray-500">No assignments yet.</p>
        )}
        {filteredAssigns.map((a) => {
          const report = reports.find((r) => r.assignment_id === a.id);
          return (
            <div key={a.id} className="rounded-xl border bg-white p-3 space-y-2">
              <p className="text-sm font-medium">
                {a.profiles?.full_name || a.user_id.slice(0, 8)}
                <span className="text-gray-400 font-normal"> · {a.status}</span>
              </p>
              {report && (
                <div className="text-xs bg-gray-50 rounded-md p-2 space-y-1">
                  <p>
                    <span className="font-medium">Severity:</span>{" "}
                    {report.severity}
                  </p>
                  <p>
                    <span className="font-medium">Tried:</span>{" "}
                    {report.what_tried}
                  </p>
                  {report.actual && (
                    <p>
                      <span className="font-medium">Actual:</span>{" "}
                      {report.actual}
                    </p>
                  )}
                  {report.device && (
                    <p>
                      <span className="font-medium">Device:</span>{" "}
                      {report.device}
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {a.status === "submitted" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setAssignmentStatus(a.id, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setAssignmentStatus(a.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {a.status === "accepted" && (
                  <Button
                    size="sm"
                    onClick={() => setAssignmentStatus(a.id, "paid")}
                  >
                    Mark paid
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
