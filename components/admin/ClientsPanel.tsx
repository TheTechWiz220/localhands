"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Search,
  Star,
  Flag,
  Ban,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type ListedClient = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  avatar_url: string | null;
  created_at: string | null;
  whatsapp_phone: string | null;
  verification_status: string | null;
  admin_notes: string | null;
  jobs_posted: number;
  jobs_completed: number;
  avg_rating: number;
  rating_count: number;
};

type ClientJob = {
  id: string;
  title: string;
  status: string;
  location_area: string | null;
  skill_needed: string | null;
  budget: number | null;
  created_at: string;
};

const FLAG_PREFIX = "[FLAGGED]";

function isFlagged(notes: string | null) {
  return !!(notes && notes.trimStart().startsWith(FLAG_PREFIX));
}

function stripFlag(notes: string | null) {
  if (!notes) return "";
  const t = notes.trimStart();
  if (t.startsWith(FLAG_PREFIX)) {
    return t.slice(FLAG_PREFIX.length).replace(/^\n/, "").trim();
  }
  return notes;
}

function withFlag(notes: string | null) {
  const body = stripFlag(notes);
  return body ? `${FLAG_PREFIX}\n${body}` : FLAG_PREFIX;
}

function statusBadge(status: string | null, notes: string | null) {
  const s = (status || "pending").toLowerCase();
  if (s === "suspended") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
        Suspended
      </span>
    );
  }
  if (isFlagged(notes)) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium">
        Flagged
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-800 font-medium">
      Active
    </span>
  );
}

export default function ClientsPanel() {
  const supabase = createClient();
  const [list, setList] = useState<ListedClient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [jobsByClient, setJobsByClient] = useState<Record<string, ClientJob[]>>(
    {}
  );
  const [loadingJobs, setLoadingJobs] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [notesSupported, setNotesSupported] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg("");

    const { data: byRole } = await supabase
      .from("profiles")
      .select(
        "id, full_name, location_area, avatar_url, created_at, role, whatsapp_phone, verification_status"
      )
      .eq("role", "client")
      .order("full_name", { ascending: true });

    const roleRows = byRole || [];

    const { data: jobClients } = await supabase
      .from("job_requests")
      .select("client_id")
      .not("client_id", "is", null);

    const idSet = new Set<string>(roleRows.map((p: any) => p.id));
    for (const row of jobClients || []) {
      if (row.client_id) idSet.add(row.client_id);
    }

    const ids = Array.from(idSet);
    if (ids.length === 0) {
      setList([]);
      setLoading(false);
      return;
    }

    let profiles: any[] | null = null;
    const withNotes = await supabase
      .from("profiles")
      .select(
        "id, full_name, location_area, avatar_url, created_at, role, whatsapp_phone, verification_status, admin_notes"
      )
      .in("id", ids)
      .neq("role", "admin");

    if (withNotes.error) {
      const without = await supabase
        .from("profiles")
        .select(
          "id, full_name, location_area, avatar_url, created_at, role, whatsapp_phone, verification_status"
        )
        .in("id", ids)
        .neq("role", "admin");
      profiles = without.data;
      setNotesSupported(false);
    } else {
      profiles = withNotes.data;
      setNotesSupported(true);
    }

    const seen = new Set<string>();
    const unique = (profiles || []).filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const enriched: ListedClient[] = [];
    for (const p of unique) {
      const { count: posted } = await supabase
        .from("job_requests")
        .select("id", { count: "exact", head: true })
        .eq("client_id", p.id);

      const { count: completed } = await supabase
        .from("job_requests")
        .select("id", { count: "exact", head: true })
        .eq("client_id", p.id)
        .eq("status", "completed");

      const { data: ratingRows } = await supabase
        .from("ratings")
        .select("rating")
        .eq("to_user_id", p.id);

      let avg = 0;
      const rCount = ratingRows?.length || 0;
      if (rCount > 0) {
        avg =
          Math.round(
            (ratingRows!.reduce(
              (s: number, r: any) => s + (r.rating || 0),
              0
            ) /
              rCount) *
              10
          ) / 10;
      }

      enriched.push({
        id: p.id,
        full_name: p.full_name,
        location_area: p.location_area,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        whatsapp_phone: p.whatsapp_phone || null,
        verification_status: p.verification_status || "pending",
        admin_notes: p.admin_notes || null,
        jobs_posted: posted || 0,
        jobs_completed: completed || 0,
        avg_rating: avg,
        rating_count: rCount,
      });
    }

    enriched.sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || "")
    );
    setList(enriched);
    const drafts: Record<string, string> = {};
    for (const c of enriched) {
      drafts[c.id] = stripFlag(c.admin_notes);
    }
    setNoteDraft(drafts);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadJobs(clientId: string) {
    if (jobsByClient[clientId]) return;
    setLoadingJobs(clientId);
    const { data } = await supabase
      .from("job_requests")
      .select(
        "id, title, status, location_area, skill_needed, budget, created_at"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(20);
    setJobsByClient((prev) => ({
      ...prev,
      [clientId]: (data as ClientJob[]) || [],
    }));
    setLoadingJobs(null);
  }

  function toggleJobs(clientId: string) {
    if (expandedId === clientId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(clientId);
    loadJobs(clientId);
  }

  async function setClientStatus(
    clientId: string,
    action: "clear" | "flag" | "suspend"
  ) {
    const labels = {
      clear: "Clear flags/suspend and mark this client active again?",
      flag: "Flag this client? Admins will see a warning on their card.",
      suspend:
        "Suspend this client? They stay visible here with a Suspended badge so you can track them.",
    };
    if (!window.confirm(labels[action])) return;

    setActingId(clientId);
    setMessage("");
    setErrorMsg("");

    const client = list.find((c) => c.id === clientId);
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (action === "suspend") {
      payload.verification_status = "suspended";
    } else if (action === "flag") {
      payload.verification_status = "pending";
      if (notesSupported) {
        payload.admin_notes = withFlag(
          client?.admin_notes || noteDraft[clientId] || ""
        );
      }
    } else {
      payload.verification_status = "pending";
      if (notesSupported) {
        payload.admin_notes =
          stripFlag(client?.admin_notes || noteDraft[clientId] || "") || null;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", clientId);

    setActingId(null);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setMessage(
      action === "suspend"
        ? "Client suspended."
        : action === "flag"
          ? "Client flagged."
          : "Client marked active."
    );
    setList((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        const nextNotes =
          action === "flag"
            ? withFlag(c.admin_notes)
            : action === "clear"
              ? stripFlag(c.admin_notes) || null
              : c.admin_notes;
        if (action === "flag" || action === "clear") {
          setNoteDraft((d) => ({ ...d, [clientId]: stripFlag(nextNotes) }));
        }
        return {
          ...c,
          verification_status: action === "suspend" ? "suspended" : "pending",
          admin_notes: nextNotes,
        };
      })
    );
  }

  async function saveNote(clientId: string) {
    if (!notesSupported) {
      setErrorMsg(
        "Admin notes need a DB column. Run in Supabase SQL: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes text;"
      );
      return;
    }
    setActingId(clientId);
    setMessage("");
    setErrorMsg("");
    const client = list.find((c) => c.id === clientId);
    const body = (noteDraft[clientId] || "").trim();
    const note = isFlagged(client?.admin_notes || null)
      ? withFlag(body)
      : body || null;
    const { error } = await supabase
      .from("profiles")
      .update({
        admin_notes: note,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);
    setActingId(null);
    if (error) {
      setErrorMsg(
        error.message.includes("admin_notes")
          ? "Admin notes column missing. Run in Supabase: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes text;"
          : error.message
      );
      setNotesSupported(false);
      return;
    }
    setMessage("Note saved.");
    setList((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, admin_notes: typeof note === "string" ? note : null }
          : c
      )
    );
  }

  const nameCounts: Record<string, number> = {};
  for (const c of list) {
    const key = (c.full_name || "").trim().toLowerCase();
    if (!key) continue;
    nameCounts[key] = (nameCounts[key] || 0) + 1;
  }

  const filtered = list.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      c.full_name || "",
      c.location_area || "",
      c.whatsapp_phone || "",
      c.verification_status || "",
      c.admin_notes || "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Clients</h2>
        <Badge variant="secondary">{list.length}</Badge>
      </div>
      <p className="text-xs text-gray-400">
        No emails shown. Phone is for admin safety only. Flag or suspend if a
        worker reports a problem. Same name twice = possible duplicate accounts.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Search name, area, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
          {message}
        </p>
      )}
      {errorMsg && (
        <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">
          {errorMsg}
        </p>
      )}

      {loading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          {list.length === 0 ? "No clients yet." : "No match for that search."}
        </p>
      ) : (
        filtered.map((c) => {
          const isExpanded = expandedId === c.id;
          const jobs = jobsByClient[c.id] || [];
          return (
            <div
              key={c.id}
              className={`rounded-xl border bg-white p-4 space-y-3 ${
                c.verification_status === "suspended"
                  ? "border-red-200 bg-red-50/30"
                  : isFlagged(c.admin_notes)
                    ? "border-amber-200 bg-amber-50/30"
                    : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {c.avatar_url ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const url = c.avatar_url;
                      if (url) setAvatarPreview(url);
                    }}
                    className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 active:opacity-80"
                    title="Tap to enlarge"
                    aria-label="View client photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.avatar_url}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover border pointer-events-none"
                    />
                  </button>
                ) : (
                  <div className="h-11 w-11 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {(c.full_name || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm truncate">
                      {c.full_name || "Unnamed"}
                    </h3>
                    {statusBadge(c.verification_status, c.admin_notes)}
                    {(c.full_name || "").trim() &&
                      nameCounts[(c.full_name || "").trim().toLowerCase()] >
                        1 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 font-medium">
                          Possible duplicate
                        </span>
                      )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {c.location_area || "Area not set"}
                  </p>
                  {c.whatsapp_phone ? (
                    <p className="text-xs text-green-700 mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <a
                        href={`https://wa.me/${c.whatsapp_phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {c.whatsapp_phone}
                      </a>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">No phone on file</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                <button
                  type="button"
                  onClick={() => toggleJobs(c.id)}
                  className="underline-offset-2 hover:underline text-left"
                >
                  <strong>{c.jobs_posted}</strong> posted
                  {isExpanded ? (
                    <ChevronUp className="inline h-3 w-3 ml-0.5" />
                  ) : (
                    <ChevronDown className="inline h-3 w-3 ml-0.5" />
                  )}
                </button>
                <span>
                  <strong>{c.jobs_completed}</strong> completed
                </span>
                {c.rating_count > 0 ? (
                  <span className="flex items-center gap-0.5 text-amber-600">
                    <Star className="h-3 w-3 fill-current" />
                    {c.avg_rating}
                    <span className="text-gray-400">({c.rating_count})</span>
                  </span>
                ) : (
                  <span className="text-gray-400">No ratings</span>
                )}
              </div>

              {isExpanded && (
                <div className="rounded-lg border bg-gray-50 p-2 space-y-1.5">
                  {loadingJobs === c.id ? (
                    <div className="py-2 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : jobs.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No jobs posted yet.
                    </p>
                  ) : (
                    jobs.map((j) => (
                      <div
                        key={j.id}
                        className="text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 py-1 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium text-gray-800">
                          {j.title || "Untitled"}
                        </span>
                        <span className="text-gray-400 capitalize">{j.status}</span>
                        {j.location_area && (
                          <span className="text-gray-500">{j.location_area}</span>
                        )}
                        {j.skill_needed && (
                          <span className="text-gray-500">{j.skill_needed}</span>
                        )}
                        <span className="text-gray-400 ml-auto">
                          {new Date(j.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-500 font-medium">
                  Admin note
                </label>
                <textarea
                  value={noteDraft[c.id] ?? ""}
                  onChange={(e) =>
                    setNoteDraft((prev) => ({
                      ...prev,
                      [c.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="e.g. Worker reported odd request — follow up"
                  className="w-full text-xs rounded-lg border px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  disabled={actingId === c.id}
                  onClick={() => saveNote(c.id)}
                >
                  {actingId === c.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Save note"
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isFlagged(c.admin_notes) &&
                  c.verification_status !== "suspended" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-amber-300 text-amber-900 hover:bg-amber-50"
                      disabled={actingId === c.id}
                      onClick={() => setClientStatus(c.id, "flag")}
                    >
                      <Flag className="h-3.5 w-3.5 mr-1" /> Flag
                    </Button>
                  )}
                {c.verification_status !== "suspended" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-red-300 text-red-800 hover:bg-red-50"
                    disabled={actingId === c.id}
                    onClick={() => setClientStatus(c.id, "suspend")}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
                  </Button>
                )}
                {(isFlagged(c.admin_notes) ||
                  c.verification_status === "suspended") && (
                  <Button
                    size="sm"
                    className="flex-1 bg-green-700 hover:bg-green-800"
                    disabled={actingId === c.id}
                    onClick={() => setClientStatus(c.id, "clear")}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>

              {c.created_at && (
                <p className="text-[10px] text-gray-400">
                  Joined {new Date(c.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })
      )}

      {avatarPreview && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setAvatarPreview(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAvatarPreview(null)}
              className="absolute -top-10 right-0 text-white text-sm font-medium px-3 py-1 rounded-full bg-white/20"
            >
              Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarPreview}
              alt="Client photo"
              className="w-full rounded-2xl object-cover shadow-xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
