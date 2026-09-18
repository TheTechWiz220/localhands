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

type PaymentRow = {
  id: string;
  assignment_id: string;
  amount: number;
  method: string;
  wave_ref: string | null;
  notes: string | null;
  paid_at: string;
};

export default function AdminTestingPage() {
  const supabase = createClient();
  const [access, setAccess] = useState<"loading" | "denied" | "allowed">(
    "loading"
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [checklist, setChecklist] = useState("");
  const [maxSlots, setMaxSlots] = useState(10);
  const [testerReward, setTesterReward] = useState(0);
  const [campaignPrice, setCampaignPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const [payFor, setPayFor] = useState<AssignmentRow | null>(null);
  const [waveRef, setWaveRef] = useState("");
  const [payMethod, setPayMethod] = useState<"wave" | "cash" | "other">("wave");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);

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

    const rows = (assigns as AssignmentRow[]) || [];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const nameMap: Record<string, string | null> = {};
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

    const { data: pays } = await supabase
      .from("test_payments")
      .select("id, assignment_id, amount, method, wave_ref, notes, paid_at")
      .order("paid_at", { ascending: false });
    setPayments((pays as PaymentRow[]) || []);
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

  async function confirmPaid() {
    if (!payFor) return;
    const camp = campaigns.find((c) => c.id === payFor.campaign_id);
    const amount = Number(camp?.tester_reward || 0);

    if (payMethod === "wave" && !waveRef.trim()) {
      setMsg("Add Wave transaction reference (or switch method to Cash).");
      return;
    }

    setPaying(true);
    setMsg(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: payErr } = await supabase.from("test_payments").insert({
      assignment_id: payFor.id,
      amount,
      method: payMethod,
      wave_ref: waveRef.trim() || null,
      notes: payNotes.trim() || null,
      paid_by: user?.id,
      paid_at: new Date().toISOString(),
    });

    if (payErr) {
      setPaying(false);
      setMsg(
        payErr.message.toLowerCase().includes("unique")
          ? "Payment already recorded for this tester."
          : payErr.message.includes("test_payments")
            ? "Run testing-payments.sql in Supabase first."
            : payErr.message
      );
      return;
    }

    const { error: stErr } = await supabase
      .from("test_assignments")
      .update({ status: "paid" })
      .eq("id", payFor.id);

    setPaying(false);
    if (stErr) {
      setMsg(stErr.message);
      return;
    }

    setPayFor(null);
    setWaveRef("");
    setPayNotes("");
    setPayMethod("wave");
    setMsg(`Paid ${amount.toLocaleString()} GMD recorded in ledger.`);
    await load();
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

  const paymentByAssignment = new Map(
    payments.map((p) => [p.assignment_id, p])
  );

  const acceptedUnpaid = assignments.filter((a) => a.status === "accepted");
  const paidAssigns = assignments.filter((a) => a.status === "paid");
  const paidMissingLedger = paidAssigns.filter(
    (a) => !paymentByAssignment.has(a.id)
  );

  const dueAmount = acceptedUnpaid.reduce((sum, a) => {
    const c = campaigns.find((x) => x.id === a.campaign_id);
    return sum + Number(c?.tester_reward || 0);
  }, 0);

  // Ledger total (real records)
  const paidFromLedger = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );
  // Estimated for old "Mark paid" without ledger row
  const paidMissingEstimate = paidMissingLedger.reduce((sum, a) => {
    const c = campaigns.find((x) => x.id === a.campaign_id);
    return sum + Number(c?.tester_reward || 0);
  }, 0);
  const paidAmountDisplay = paidFromLedger + paidMissingEstimate;

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

      <section className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
        <h2 className="font-semibold text-sm text-green-900">
          Campaign payments (Wave-ready)
        </h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white rounded-lg p-2 border">
            <p className="text-lg font-bold text-amber-700">
              {dueAmount.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500">Due GMD</p>
            <p className="text-[10px] text-gray-400">
              {acceptedUnpaid.length} waiting
            </p>
          </div>
          <div className="bg-white rounded-lg p-2 border">
            <p className="text-lg font-bold text-green-700">
              {paidAmountDisplay.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500">Paid GMD</p>
            <p className="text-[10px] text-gray-400">
              {paidAssigns.length} paid
              {paidMissingLedger.length > 0
                ? ` · ${paidMissingLedger.length} need ledger`
                : ""}
            </p>
          </div>
          <div className="bg-white rounded-lg p-2 border">
            <p className="text-lg font-bold text-gray-800">{payments.length}</p>
            <p className="text-[10px] text-gray-500">Records</p>
            <p className="text-[10px] text-gray-400">in ledger</p>
          </div>
        </div>

        {paidMissingLedger.length > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
            {paidMissingLedger.length} tester(s) marked paid before the ledger.
            Open the assignment below and tap <b>Add to ledger</b> to record
            amount + Wave ref.
          </p>
        )}

        {payments.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {payments.slice(0, 20).map((p) => {
              const a = assignments.find((x) => x.id === p.assignment_id);
              const c = a
                ? campaigns.find((x) => x.id === a.campaign_id)
                : null;
              return (
                <div
                  key={p.id}
                  className="text-xs bg-white rounded-md border px-2 py-1.5 flex justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {a?.profiles?.full_name || "Tester"}
                      {c ? ` · ${c.title}` : ""}
                    </p>
                    <p className="text-gray-500">
                      {p.method}
                      {p.wave_ref ? ` · ${p.wave_ref}` : ""}
                      {" · "}
                      {new Date(p.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-semibold text-green-700 whitespace-nowrap">
                    {Number(p.amount).toLocaleString()} GMD
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-green-800">
          Pay on Wave, then record ref here. Paid GMD uses ledger amounts; old
          marks without a record are estimated until you add them.
        </p>
      </section>

      {payFor && (
        <div className="rounded-xl border bg-white p-4 space-y-3 shadow-sm">
          <h2 className="font-semibold text-sm">Record payment in ledger</h2>
          <p className="text-xs text-gray-600">
            {payFor.profiles?.full_name || "Tester"} ·{" "}
            {campaigns.find((c) => c.id === payFor.campaign_id)?.title}
            {" · "}
            {Number(
              campaigns.find((c) => c.id === payFor.campaign_id)?.tester_reward ||
                0
            ).toLocaleString()}{" "}
            GMD
          </p>
          <label className="block text-xs font-medium text-gray-600">
            Method
            <select
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={payMethod}
              onChange={(e) =>
                setPayMethod(e.target.value as "wave" | "cash" | "other")
              }
            >
              <option value="wave">Wave</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Wave / payment reference {payMethod === "wave" ? "*" : "(optional)"}
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={waveRef}
              onChange={(e) => setWaveRef(e.target.value)}
              placeholder="Wave transaction ID or receipt no."
            />
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Notes (optional)
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="e.g. paid to 70XXXXXX"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={confirmPaid} disabled={paying} className="flex-1">
              {paying ? "Saving…" : "Save to ledger"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPayFor(null)}
              disabled={paying}
            >
              Cancel
            </Button>
          </div>
        </div>
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
          const payment = paymentByAssignment.get(a.id);
          const camp = campaigns.find((c) => c.id === a.campaign_id);
          const needsLedger = a.status === "paid" && !payment;
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
              {payment && (
                <p className="text-xs text-green-800 bg-green-50 rounded-md px-2 py-1">
                  Ledger: {Number(payment.amount).toLocaleString()} GMD via{" "}
                  {payment.method}
                  {payment.wave_ref ? ` · ${payment.wave_ref}` : ""}
                </p>
              )}
              {needsLedger && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-md px-2 py-1">
                  Marked paid, but no ledger row yet (amount not counted until
                  recorded).
                </p>
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
                {a.status === "accepted" && !payment && (
                  <Button size="sm" onClick={() => setPayFor(a)}>
                    Record Wave / pay
                    {camp
                      ? ` (${Number(camp.tester_reward).toLocaleString()} GMD)`
                      : ""}
                  </Button>
                )}
                {needsLedger && (
                  <Button size="sm" onClick={() => setPayFor(a)}>
                    Add to ledger
                    {camp
                      ? ` (${Number(camp.tester_reward).toLocaleString()} GMD)`
                      : ""}
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
