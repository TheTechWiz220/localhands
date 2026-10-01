import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  workerId?: string;
};

function storagePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/proof-media/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function POST(request: Request) {
  try {
    const server = await createServerClient();
    const {
      data: { user },
      error: userErr,
    } = await server.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: adminErr } = await server
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (adminErr || adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const workerId = typeof body.workerId === "string" ? body.workerId : "";
    if (!workerId) {
      return NextResponse.json({ error: "workerId is required" }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: worker, error: workerErr } = await service
      .from("profiles")
      .select("id, role, verification_status, avatar_url")
      .eq("id", workerId)
      .maybeSingle();

    if (workerErr) {
      return NextResponse.json({ error: workerErr.message }, { status: 500 });
    }

    if (!worker || worker.role !== "worker" || worker.verification_status !== "rejected") {
      return NextResponse.json(
        { error: "Only rejected worker accounts can be reset to Client." },
        { status: 409 }
      );
    }

    const [{ data: proofRows, error: proofReadErr }, { data: certRows, error: certReadErr }] =
      await Promise.all([
        service.from("proof_media").select("media_url").eq("worker_id", workerId),
        service.from("worker_certificates").select("media_url").eq("worker_id", workerId),
      ]);

    if (proofReadErr) {
      return NextResponse.json({ error: proofReadErr.message }, { status: 500 });
    }
    if (certReadErr) {
      return NextResponse.json({ error: certReadErr.message }, { status: 500 });
    }

    const storagePaths = [
      worker.avatar_url,
      ...(proofRows || []).map((row) => row.media_url),
      ...(certRows || []).map((row) => row.media_url),
    ]
      .map(storagePathFromPublicUrl)
      .filter((path): path is string => Boolean(path));

    // Service role is used only after the request has been authenticated and
    // the caller has been verified as an admin. This avoids relying on
    // worker-owned RLS policies for an admin operation.
    const deletions = await Promise.all([
      service.from("worker_skills").delete().eq("worker_id", workerId),
      service.from("proof_media").delete().eq("worker_id", workerId),
      service.from("worker_certificates").delete().eq("worker_id", workerId),
    ]);

    const failedDelete = deletions.find((result) => result.error);
    if (failedDelete?.error) {
      return NextResponse.json(
        { error: failedDelete.error.message },
        { status: 500 }
      );
    }

    const { error: profileErr } = await service
      .from("profiles")
      .update({
        role: "client",
        verification_status: "pending",
        is_verified: false,
        id_verified: false,
        id_verified_at: null,
        verification_notes: null,
        admin_notes: null,
        bio: null,
        whatsapp_phone: null,
        avatar_url: null,
        availability: null,
        spoken_languages: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", workerId);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    let storageWarning: string | null = null;
    if (storagePaths.length > 0) {
      const { error: storageErr } = await service.storage
        .from("proof-media")
        .remove([...new Set(storagePaths)]);

      if (storageErr) {
        storageWarning = storageErr.message;
      }
    }

    return NextResponse.json({
      ok: true,
      storageWarning,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Reset failed" },
      { status: 500 }
    );
  }
}
