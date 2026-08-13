"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { calcFees, formatGmd, PLATFORM_FEE_PERCENT } from "@/lib/pricing";
import { AREAS } from "@/lib/skills";

export default function RequestWorkerPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.workerId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [needAuth, setNeedAuth] = useState(false);
  const [workerName, setWorkerName] = useState("Worker");
  const [clientId, setClientId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");

  const supabase = createClient();
  const budgetNum = Number(budget);
  const fees =
    budget && !Number.isNaN(budgetNum) && budgetNum > 0
      ? calcFees(budgetNum)
      : null;

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNeedAuth(true);
        setLoading(false);
        return;
      }

      setClientId(user.id);

      await supabase.from("profiles").upsert({
        id: user.id,
        role: "client",
        updated_at: new Date().toISOString(),
      });

      const { data: worker } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", workerId)
        .maybeSingle();

      if (worker?.full_name) setWorkerName(worker.full_name);

      const { data: skills } = await supabase
        .from("worker_skills")
        .select("skill")
        .eq("worker_id", workerId)
        .limit(1);

      if (skills?.[0]?.skill) setSkill(skills[0].skill);

      setLoading(false);
    }

    init();
  }, [workerId]);

  async function submit() {
    if (!clientId) return;
    if (!title.trim() || !description.trim() || !skill.trim() || !location) {
      setError("Please fill title, description, skill and area.");
      return;
    }
    if (!budget || Number.isNaN(Number(budget)) || Number(budget) <= 0) {
      setError("Please enter a budget in GMD. Price is locked when the worker accepts.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: insertError } = await supabase.from("job_requests").insert({
      client_id: clientId,
      worker_id: workerId,
      title: title.trim(),
      description: description.trim(),
      skill_needed: skill.trim(),
      location_area: location,
      budget: Number(budget),
      status: "pending",
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDone(true);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (needAuth) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <h1 className="text-2xl font-bold">Sign in to request</h1>
        <p className="text-gray-500">
          You need an account to send a job request to {workerName}.
        </p>
        <Link href="/auth">
          <Button size="lg">Sign in with Email</Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Request sent</h1>
          <p className="text-gray-500 mt-2">
            Your job request was sent to {workerName} at the agreed budget.
            They can accept or decline from their Jobs list.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/jobs">
            <Button>View Jobs</Button>
          </Link>
          <Link href="/directory">
            <Button variant="outline">Back to Directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Request {workerName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Set a clear price. Accept locks this budget in LocalHands.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Job title *</label>
          <input
            type="text"
            placeholder="e.g. Fix phone screen"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Description *
          </label>
          <textarea
            rows={4}
            placeholder="What needs to be done, when, any details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Skill needed *</label>
          <input
            type="text"
            placeholder="e.g. Phone & Electronics Repair"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Area *</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">Select area</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Budget (GMD) *
          </label>
          <input
            type="number"
            min={1}
            placeholder="e.g. 500"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            Required. Worker accepts this price. Pay via Wave in the app after
            accept — not off-platform.
          </p>
        </div>

        {fees && (
          <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm space-y-1">
            <p className="font-medium text-green-900">Price breakdown</p>
            <p className="text-gray-700">You pay: {formatGmd(fees.amount)}</p>
            <p className="text-gray-700">
              Worker receives: {formatGmd(fees.workerGets)}
            </p>
            <p className="text-gray-500 text-xs">
              Platform fee ({PLATFORM_FEE_PERCENT}%): {formatGmd(fees.fee)}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          className="w-full"
          size="lg"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            "Send request"
          )}
        </Button>

        <button
          type="button"
          className="w-full text-sm text-gray-500"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
