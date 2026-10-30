"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  MapPin,
  Calendar,
  Wrench,
  User,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  calcFees,
  formatGmd,
  PLATFORM_FEE_PERCENT,
  CLIENT_FEE_PERCENT,
  WORKER_FEE_PERCENT,
} from "@/lib/pricing";

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  skill_needed: string | null;
  location_area: string | null;
  budget: number | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
  client_id: string;
  worker_id: string | null;
  counter_amount?: number | null;
  counter_note?: string | null;
  countered_by?: string | null;
};

type Party = {
  id: string;
  full_name: string | null;
  role?: string | null;
  whatsapp_phone?: string | null;
  location_area?: string | null;
  verification_status?: string | null;
};

type Payment = {
  status: string;
  wave_reference: string | null;
  amount: number | null;
  method?: string | null;
  paid_at?: string | null;
};

export default function AdminJobDetailPage() {
  const params = useParams();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobRow | null>(null);
  const [client, setClient] = useState<Party | null>(null);
  const [worker, setWorker] = useState<Party | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      if (!jobId) {
        setError("Job not found");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDenied(true);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        setDenied(true);
        setLoading(false);
        return;
      }

      const { data: row, error: qErr } = await supabase
        .from("job_requests")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }
      if (!row) {
        setError("Job not found.");
        setLoading(false);
        return;
      }

      setJob(row as JobRow);

      if (row.client_id) {
        const { data: c } = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, whatsapp_phone, location_area, verification_status"
          )
          .eq("id", row.client_id)
          .maybeSingle();
        if (c) setClient(c as Party);
      }

      if (row.worker_id) {
        const { data: w } = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, whatsapp_phone, location_area, verification_status"
          )
          .eq("id", row.worker_id)
          .maybeSingle();
        if (w) setWorker(w as Party);
      }

      const { data: pay } = await supabase
        .from("payments")
        .select("status, wave_reference, amount, method, paid_at")
        .eq("job_id", jobId)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pay) setPayment(pay as Payment);

      setLoading(false);
    }

    load();
  }, [jobId]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-green-700" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-3 text-center">
        <p className="text-sm text-gray-600">Admin access required.</p>
        <Link href="/auth">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-3">
        <p className="text-sm text-red-700">{error || "Job not found."}</p>
        <Link href="/admin" className="text-sm text-green-700 underline">
          Back to admin
        </Link>
      </div>
    );
  }

  const fees = job.budget != null ? calcFees(job.budget) : null;
  const created = new Date(job.created_at).toLocaleString();

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Admin · Job detail
          </p>
          <h1 className="text-xl font-bold text-gray-900 leading-snug">
            {job.title}
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {created}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 capitalize">
          {job.status}
        </Badge>
      </div>

      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Description</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {job.description || "No description."}
        </p>
        <div className="flex flex-wrap gap-2">
          {job.skill_needed && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100">
              <Wrench className="h-3.5 w-3.5" />
              {job.skill_needed}
            </span>
          )}
          {job.location_area && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100">
              <MapPin className="h-3.5 w-3.5" />
              {job.location_area}
            </span>
          )}
        </div>
      </section>

      {fees && (
        <section className="rounded-xl border border-green-100 bg-green-50/50 p-4 space-y-1">
          <h2 className="text-sm font-semibold text-green-900">Money</h2>
          <p className="text-sm">Budget: {formatGmd(fees.amount)}</p>
          <p className="text-sm">
            Client pays: <strong>{formatGmd(fees.clientPays)}</strong> (+
            {CLIENT_FEE_PERCENT}%)
          </p>
          <p className="text-sm">
            Worker receives: <strong>{formatGmd(fees.workerGets)}</strong> (−
            {WORKER_FEE_PERCENT}%)
          </p>
          <p className="text-xs text-gray-600">
            Platform total {PLATFORM_FEE_PERCENT}%: {formatGmd(fees.fee)}
          </p>
          {job.counter_amount != null && (
            <p className="text-sm text-amber-800 pt-2 border-t border-green-100 mt-2">
              Counter: {formatGmd(job.counter_amount)}
              {job.counter_note ? ` — “${job.counter_note}”` : ""}
              {job.countered_by ? ` · by ${job.countered_by}` : ""}
            </p>
          )}
        </section>
      )}

      <section className="rounded-xl border bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">People</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <User className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                Client: {client?.full_name || "—"}
              </p>
              <p className="text-xs text-gray-500">
                {client?.location_area || ""}
                {client?.whatsapp_phone
                  ? ` · WA ${client.whatsapp_phone}`
                  : ""}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">{job.client_id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Briefcase className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                Worker: {worker?.full_name || (job.worker_id ? "—" : "Unclaimed")}
              </p>
              {worker && (
                <>
                  <p className="text-xs text-gray-500">
                    {worker.verification_status || ""}
                    {worker.whatsapp_phone
                      ? ` · WA ${worker.whatsapp_phone}`
                      : ""}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {job.worker_id}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 space-y-1">
        <h2 className="text-sm font-semibold text-gray-900">Payment</h2>
        {payment ? (
          <>
            <p className="text-sm capitalize">Status: {payment.status}</p>
            {payment.amount != null && (
              <p className="text-sm">Amount: {formatGmd(payment.amount)}</p>
            )}
            {payment.method && (
              <p className="text-sm">Method: {payment.method}</p>
            )}
            {payment.wave_reference && (
              <p className="text-xs font-mono text-gray-600">
                Wave: {payment.wave_reference}
              </p>
            )}
            {payment.paid_at && (
              <p className="text-xs text-gray-500">
                {new Date(payment.paid_at).toLocaleString()}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">No payment recorded yet.</p>
        )}
      </section>

      <p className="text-[10px] text-gray-400 font-mono break-all">
        Job id: {job.id}
      </p>

      <Link href="/admin">
        <Button variant="outline" className="w-full">
          Back to admin
        </Button>
      </Link>
    </div>
  );
}
