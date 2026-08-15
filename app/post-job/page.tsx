"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SKILLS, AREAS } from "@/lib/skills";
import { calcFees, formatGmd, PLATFORM_FEE_PERCENT } from "@/lib/pricing";
import { Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function PostJobPage() {
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [needAuth, setNeedAuth] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState("");

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

      // Ensure profile exists, but never demote admin/worker
      const { data: existing } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("profiles").insert({
          id: user.id,
          role: "client",
          updated_at: new Date().toISOString(),
        });
      } else if (!existing.role || existing.role === "") {
        await supabase
          .from("profiles")
          .update({ role: "client", updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
      // admin / worker roles left untouched

      setLoading(false);
    }
    init();
  }, []);

  async function submit() {
    if (!clientId) return;
    if (!title.trim() || !description.trim() || !skill || !location) {
      setError("Please fill title, description, skill and area.");
      return;
    }
    if (!budget || Number.isNaN(Number(budget)) || Number(budget) <= 0) {
      setError("Enter a budget in GMD.");
      return;
    }

    setSubmitting(true);
    setError("");

    const { error: insertError } = await supabase.from("job_requests").insert({
      client_id: clientId,
      worker_id: null,
      title: title.trim(),
      description: description.trim(),
      skill_needed: skill,
      location_area: location,
      budget: Number(budget),
      status: "open",
    });

    setSubmitting(false);

    if (insertError) {
      if (
        insertError.message.includes("open") ||
        insertError.message.includes("check") ||
        insertError.message.includes("status")
      ) {
        const { error: e2 } = await supabase.from("job_requests").insert({
          client_id: clientId,
          worker_id: null,
          title: title.trim(),
          description: description.trim(),
          skill_needed: skill,
          location_area: location,
          budget: Number(budget),
          status: "pending",
        });
        if (e2) {
          setError(
            e2.message.includes("policy")
              ? "Could not post. Check job_requests insert policy in Supabase."
              : e2.message
          );
          return;
        }
        setDone(true);
        return;
      }
      setError(
        insertError.message.includes("policy")
          ? "Could not post. Check job_requests insert policy in Supabase."
          : insertError.message
      );
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
        <h1 className="text-2xl font-bold">Sign in to post a job</h1>
        <p className="text-gray-500">
          Create an account or sign in to post work for workers to claim.
        </p>
        <Link href="/auth">
          <Button size="lg">Sign in</Button>
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
          <h1 className="text-2xl font-bold">Job posted</h1>
          <p className="text-gray-500 mt-2">
            Workers can see this open job and claim it. You can also request a
            specific person from Find.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/jobs">
            <Button>View My Jobs</Button>
          </Link>
          <Link href="/directory">
            <Button variant="outline">Find a worker</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Post a Job</h1>
        <p className="text-sm text-gray-500">
          Open listing — any matching worker can claim it. Or pick someone from{" "}
          <Link href="/directory" className="text-green-700 font-medium">
            Find
          </Link>
          .
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Title *</label>
          <input
            type="text"
            placeholder="e.g. Fix Samsung screen"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Skill needed *</label>
          <select
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">Select skill</option>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Location *</label>
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
          <label className="text-sm font-medium mb-1.5 block">Description *</label>
          <textarea
            rows={4}
            placeholder="What needs to be done, when, any details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Budget (GMD) *</label>
          <input
            type="number"
            min={1}
            placeholder="e.g. 1500"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-600"
          />
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
              Posting...
            </>
          ) : (
            "Post Job"
          )}
        </Button>
      </div>
    </div>
  );
}
