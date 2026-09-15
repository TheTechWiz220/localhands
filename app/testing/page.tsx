"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
} from "lucide-react";
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
  tester_reward: number;
};

type Assignment = {
  id: string;
  campaign_id: string;
  status: string;
  claimed_at: string;
};

type Report = {
  assignment_id: string;
};

const severityOptions = [
  { value: "blocker", label: "Blocker — can't complete flow" },
  { value: "annoying", label: "Annoying — works but friction" },
  { value: "typo", label: "Typo / polish" },
] as const;

export default function TestingPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [activeClaim, setActiveClaim] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<Assignment | null>(null);
  const [whatTried, setWhatTried] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [severity, setSeverity] = useState<"blocker" | "annoying" | "typo">(
    "annoying"
  );
  const [device, setDevice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data: camps } = await supabase
      .from("test_campaigns")
      .select(
        "id, title, brief, checklist, status, max_slots, deadline, tester_reward"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false });

    setCampaigns((camps as Campaign[]) || []);

    const { data: assigns } = await supabase
      .from("test_assignments")
      .select("id, campaign_id, status, claimed_at")
      .eq("user_id", user.id);

    setAssignments((assigns as Assignment[]) || []);

    const { data: reps } = await supabase
      .from("test_reports")
      .select("assignment_id");
    setReportedIds(
      new Set(((reps as Report[]) || []).map((r) => r.assignment_id))
    );

    // slot counts for open campaigns
    const ids = ((camps as Campaign[]) || []).map((c) => c.id);
    if (ids.length) {
      const { data: allAssigns } = await supabase
        .from("test_assignments")
        .select("campaign_id")
        .in("campaign_id", ids);
      const counts: Record<string, number> = {};
      (allAssigns || []).forEach((a: { campaign_id: string }) => {
        counts[a.campaign_id] = (counts[a.campaign_id] || 0) + 1;
      });
      setSlotCounts(counts);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function claim(campaignId: string) {
    if (!userId) return;
    setActiveClaim(campaignId);
    setMessage(null);
    const { error } = await supabase.from("test_assignments").insert({
      campaign_id: campaignId,
      user_id: userId,
      status: "claimed",
    });
    setActiveClaim(null);
    if (error) {
      setMessage(error.message.includes("unique")
        ? "You already claimed this campaign."
        : error.message);
      return;
    }
    setMessage("Claimed — complete the checklist and submit a report.");
    await load();
  }

  async function submitReport() {
    if (!reportFor || !whatTried.trim()) {
      setMessage("Describe what you tried.");
      return;
    }
    setSubmitting(true);
    setMessage(null);

    const { error: repErr } = await supabase.from("test_reports").insert({
      assignment_id: reportFor.id,
      what_tried: whatTried.trim(),
      expected: expected.trim() || null,
      actual: actual.trim() || null,
      severity,
      device: device.trim() || null,
    });

    if (repErr) {
      setSubmitting(false);
      setMessage(repErr.message);
      return;
    }

    await supabase
      .from("test_assignments")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", reportFor.id);

    setSubmitting(false);
    setReportFor(null);
    setWhatTried("");
    setExpected("");
    setActual("");
    setDevice("");
    setSeverity("annoying");
    setMessage("Report submitted — thank you.");
    await load();
  }

  function assignmentFor(campaignId: string) {
    return assignments.find((a) => a.campaign_id === campaignId);
  }

  function statusBadge(status: string) {
    const map: Record<string, { icon: typeof Clock; text: string; cls: string }> =
      {
        claimed: {
          icon: Clock,
          text: "Claimed — submit report",
          cls: "bg-amber-50 text-amber-800",
        },
        submitted: {
          icon: CheckCircle2,
          text: "Submitted — under review",
          cls: "bg-blue-50 text-blue-800",
        },
        accepted: {
          icon: CheckCircle2,
          text: "Accepted",
          cls: "bg-green-50 text-green-800",
        },
        rejected: {
          icon: XCircle,
          text: "Rejected",
          cls: "bg-red-50 text-red-800",
        },
        paid: {
          icon: CheckCircle2,
          text: "Paid",
          cls: "bg-green-100 text-green-900",
        },
      };
    const s = map[status] || map.claimed;
    const Icon = s.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${s.cls}`}
      >
        <Icon className="h-3 w-3" />
        {s.text}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-3" />
        <p className="text-gray-500 text-sm">Loading testing…</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 space-y-4 text-center">
        <FlaskConical className="h-10 w-10 mx-auto text-green-700" />
        <h1 className="text-2xl font-bold">LocalHands Testing</h1>
        <p className="text-gray-600 text-sm">
          Sign in to claim open test campaigns and submit structured reports.
        </p>
        <Link href="/auth">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-green-800">
          <FlaskConical className="h-6 w-6" />
          Testing
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Claim a campaign, follow the checklist, submit a clear bug or feedback
          report.
        </p>
      </div>

      {message && (
        <div className="text-sm rounded-lg border border-green-100 bg-green-50 text-green-900 px-3 py-2">
          {message}
        </div>
      )}

      {reportFor && (
        <div className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
          <h2 className="font-semibold">Submit report</h2>
          <label className="block text-xs font-medium text-gray-600">
            What you tried *
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
              value={whatTried}
              onChange={(e) => setWhatTried(e.target.value)}
              placeholder="Steps you followed…"
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Expected
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            What actually happened
            <textarea
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm min-h-[60px]"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Severity
            <select
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as "blocker" | "annoying" | "typo")
              }
            >
              {severityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Device / browser
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              placeholder="e.g. Android Chrome, iPhone Safari, PWA"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={submitReport} disabled={submitting}>
              {submitting ? "Sending…" : "Submit report"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setReportFor(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Open campaigns
        </h2>
        {campaigns.length === 0 && (
          <p className="text-sm text-gray-500 border rounded-lg p-4 bg-white">
            No open test campaigns right now. Check back soon.
          </p>
        )}
        {campaigns.map((c) => {
          const a = assignmentFor(c.id);
          const used = slotCounts[c.id] || 0;
          const full = used >= c.max_slots;
          return (
            <div
              key={c.id}
              className="rounded-xl border bg-white p-4 space-y-2 shadow-sm"
            >
              <div className="flex justify-between gap-2 items-start">
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
                {c.tester_reward > 0 && (
                  <span className="text-xs font-medium text-green-700 whitespace-nowrap">
                    {Number(c.tester_reward).toLocaleString()} GMD
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {c.brief}
              </p>
              {c.checklist && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-md p-2 whitespace-pre-wrap">
                  <span className="font-medium text-gray-700">Checklist</span>
                  {"\n"}
                  {c.checklist}
                </div>
              )}
              <p className="text-xs text-gray-400">
                Slots: {used}/{c.max_slots}
                {c.deadline
                  ? ` · Deadline ${new Date(c.deadline).toLocaleDateString()}`
                  : ""}
              </p>
              {a ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {statusBadge(a.status)}
                  {a.status === "claimed" && !reportedIds.has(a.id) && (
                    <Button size="sm" onClick={() => setReportFor(a)}>
                      Submit report
                    </Button>
                  )}
                </div>
              ) : full ? (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Ban className="h-3 w-3" /> Full
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => claim(c.id)}
                  disabled={activeClaim === c.id}
                >
                  {activeClaim === c.id ? "Claiming…" : "Claim"}
                </Button>
              )}
            </div>
          );
        })}
      </section>

      {assignments.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            My testing
          </h2>
          {assignments.map((a) => {
            const camp = campaigns.find((c) => c.id === a.campaign_id);
            return (
              <div
                key={a.id}
                className="rounded-lg border bg-white px-3 py-2 flex justify-between items-center gap-2"
              >
                <span className="text-sm truncate">
                  {camp?.title || "Campaign"}
                </span>
                {statusBadge(a.status)}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
