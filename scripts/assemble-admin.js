const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const b64Path = path.join(__dirname, "..", "admin-src", "admin.zlib.b64");
const outPath = path.join(__dirname, "..", "app", "admin", "page.tsx");

const b64 = fs.readFileSync(b64Path, "utf8").trim();
let content = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");

// --- Inject Suspended tab + panel + counts ---
if (!content.includes("SuspendedPanel")) {
  content = content.replace(
    'import Link from "next/link";',
    'import Link from "next/link";\nimport SuspendedPanel from "@/components/admin/SuspendedPanel";'
  );

  content = content.replace(
    '"overview" | "verify" | "workers" | "clients" | "jobs"',
    '"overview" | "verify" | "workers" | "suspended" | "clients" | "jobs"'
  );

  content = content.replace(
    '["workers", "Workers"],\n            ["clients", "Clients"],',
    '["workers", "Workers"],\n            ["suspended", "Suspended"],\n            ["clients", "Clients"],'
  );

  const suspendedPanel = `\n      {tab === "suspended" && <SuspendedPanel />}\n\n`;
  if (!content.includes('tab === "suspended"')) {
    content = content.replace(
      '{tab === "clients" && (',
      suspendedPanel + '      {tab === "clients" && ('
    );
  }
}

// Suspended count on tab badge (like Workers / Clients)
if (!content.includes('id === "suspended"')) {
  content = content.replace(
    `{id === "clients" && clientsList.length > 0 && (
              <span className="ml-1">({clientsList.length})</span>
            )}
          </button>`,
    `{id === "clients" && clientsList.length > 0 && (
              <span className="ml-1">({clientsList.length})</span>
            )}
            {id === "suspended" &&
              stats &&
              stats.suspendedWorkers > 0 && (
                <span className="ml-1">({stats.suspendedWorkers})</span>
              )}
          </button>`
  );
}

// Stats type
if (!content.includes("suspendedWorkers: number")) {
  content = content.replace(
    `type Stats = {
  pendingWorkers: number;
  verifiedWorkers: number;
  clientsCount: number;`,
    `type Stats = {
  pendingWorkers: number;
  verifiedWorkers: number;
  suspendedWorkers: number;
  clientsCount: number;`
  );
}

// Count query
if (!content.includes("count: suspendedWorkers")) {
  content = content.replace(
    `const { count: verifiedWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "verified");

    const { count: clientsCount } = await supabase`,
    `const { count: verifiedWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "verified");

    const { count: suspendedWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "suspended");

    const { count: clientsCount } = await supabase`
  );
}

// setStats payload
if (!content.includes("suspendedWorkers: suspendedWorkers")) {
  content = content.replace(
    `setStats({
      pendingWorkers: pendingWorkers || 0,
      verifiedWorkers: verifiedWorkers || 0,
      clientsCount: clientsCount || 0,`,
    `setStats({
      pendingWorkers: pendingWorkers || 0,
      verifiedWorkers: verifiedWorkers || 0,
      suspendedWorkers: suspendedWorkers || 0,
      clientsCount: clientsCount || 0,`
  );
}

// Overview card for suspended
if (!content.includes("tap to manage")) {
  const clientsCardEnd = `              <p className="text-xs text-gray-500">tap to list</p>
            </button>
            <div className="rounded-xl border bg-white p-4 col-span-2">`;
  const withSuspended = `              <p className="text-xs text-gray-500">tap to list</p>
            </button>
            <button
              type="button"
              onClick={() => setTab("suspended")}
              className="rounded-xl border bg-white p-4 text-left hover:border-amber-300 transition"
            >
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Ban className="h-3.5 w-3.5" /> Suspended
              </div>
              <p className="text-2xl font-bold">{stats.suspendedWorkers}</p>
              <p className="text-xs text-amber-700">tap to manage</p>
            </button>
            <div className="rounded-xl border bg-white p-4 col-span-2">`;
  if (content.includes(clientsCardEnd)) {
    content = content.replace(clientsCardEnd, withSuspended);
  }
}

fs.writeFileSync(outPath, content);
console.log(
  "assembled",
  content.length,
  "SuspendedPanel",
  content.includes("SuspendedPanel"),
  "tab badge",
  content.includes('id === "suspended"'),
  "stats field",
  content.includes("suspendedWorkers: number"),
  "overview card",
  content.includes('setTab("suspended")')
);
