"use client";

import { useEffect, useState } from "react";
import { Briefcase, Plus, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Job = {
  id: string;
  title: string;
  description: string;
  skill_needed: string;
  location_area: string;
  budget: number | null;
  status: string;
  created_at: string;
  client_id: string;
  worker_id: string | null;
  client_name?: string;
  worker_name?: string;
};

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  async function loadJobs(uid: string) {
    const { data, error: qError } = await supabase
      .from("job_requests")
      .select("*")
      .or(`client_id.eq.${uid},worker_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    if (qError) {
      setError(qError.message);
      setJobs([]);
      return;
    }

    const list = data || [];
    const enriched: Job[] = [];

    for (const j of list) {
      let client_name = "Client";
      let worker_name = "Worker";

      if (j.client_id) {
        const { data: c } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", j.client_id)
          .maybeSingle();
        if (c?.full_name) client_name = c.full_name;
      }

      if (j.worker_id) {
        const { data: w } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", j.worker_id)
          .maybeSingle();
        if (w?.full_name) worker_name = w.full_name;
      }

      enriched.push({
        ...j,
        client_name,
        worker_name,
      });
    }

    setJobs(enriched);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadJobs(user.id);
      setLoading(false);
    }

    init();
  }, []);

  async function updateStatus(
    jobId: string,
    status: "accepted" | "declined" | "cancelled" | "completed"
  ) {
    setActingId(jobId);
    setError("");
    setMessage("");

    const { data, error: uError } = await supabase
      .from("job_requests")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("id, status")
      .maybeSingle();

    setActingId(null);

    if (uError) {
      setError(uError.message);
      return;
    }

    if (!data) {
      setError(
        "Update blocked. Run the job_requests update policy in Supabase SQL Editor."
      );
      return;
    }

    setMessage(`Job marked as ${status}.`);
    if (userId) await loadJobs(userId);
  }

  function statusBadge(status: string) {
    const map: Record<string, "default" | "success" | "warning" | "secondary" | "destructive"> = {
      pending: "warning",
      accepted: "success",
      in_progress: "success",
      completed: "secondary",
      declined: "destructive",
      cancelled: "secondary",
    };
    return (
      <Badge variant={map[status] || "secondary"} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600 mb-4" />
        <p className="text-gray-500">Loading jobs...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <Briefcase className="h-12 w-12 mx-auto text-gray-400" />
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-gray-500 mt-2">Sign in to see your job requests.</p>
        </div>
        <Link href="/auth">
          <Button size="lg">Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-sm text-gray-500">Requests and history</p>
        </div>
        <Link href="/directory">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Find worker
          </Button>
        </Link>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{error}</p>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-xl border bg-white py-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="font-semibold text-lg">No jobs yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            When you request a worker, the job will appear here for both of you.
          </p>
          <Link href="/directory">
            <Button>Find a Worker</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isWorker = job.worker_id === userId;
            const isClient = job.client_id === userId;

            return (
              <div key={job.id} className="rounded-xl border bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isWorker
                        ? `From ${job.client_name}`
                        : `To ${job.worker_name}`}
                      {" · "}
                      {job.location_area}
                    </p>
                  </div>
                  {statusBadge(job.status)}
                </div>

                <p className="text-sm text-gray-600">{job.description}</p>

                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <Badge variant="secondary">{job.skill_needed}</Badge>
                  {job.budget != null && (
                    <span className="px-2 py-0.5 bg-gray-50 rounded">
                      GMD {job.budget}
                    </span>
                  )}
                </div>

                {job.status === "pending" && isWorker && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={actingId === job.id}
                      onClick={() => updateStatus(job.id, "accepted")}
                    >
                      {actingId === job.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Accept
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      disabled={actingId === job.id}
                      onClick={() => updateStatus(job.id, "declined")}
                    >
                      <X className="h-4 w-4 mr-1" /> Decline
                    </Button>
                  </div>
                )}

                {job.status === "pending" && isClient && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={actingId === job.id}
                    onClick={() => updateStatus(job.id, "cancelled")}
                  >
                    Cancel request
                  </Button>
                )}

                {job.status === "accepted" && (isWorker || isClient) && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={actingId === job.id}
                    onClick={() => updateStatus(job.id, "completed")}
                  >
                    Mark completed
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
