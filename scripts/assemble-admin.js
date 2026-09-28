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
    `{id === "clients" && clientsList.length > 0 && (\n              <span className="ml-1">({clientsList.length})</span>\n            )}\n          </button>`,
    `{id === "clients" && clientsList.length > 0 && (\n              <span className="ml-1">({clientsList.length})</span>\n            )}\n            {id === "suspended" &&\n              stats &&\n              stats.suspendedWorkers > 0 && (\n                <span className="ml-1">({stats.suspendedWorkers})</span>\n              )}\n          </button>`
  );
}

// Stats type
if (!content.includes("suspendedWorkers: number")) {
  content = content.replace(
    `type Stats = {\n  pendingWorkers: number;\n  verifiedWorkers: number;\n  clientsCount: number;`,
    `type Stats = {\n  pendingWorkers: number;\n  verifiedWorkers: number;\n  suspendedWorkers: number;\n  clientsCount: number;`
  );
}

// Count query
if (!content.includes("count: suspendedWorkers")) {
  content = content.replace(
    `const { count: verifiedWorkers } = await supabase\n      .from("profiles")\n      .select("id", { count: "exact", head: true })\n      .eq("role", "worker")\n      .eq("verification_status", "verified");\n\n    const { count: clientsCount } = await supabase`,
    `const { count: verifiedWorkers } = await supabase\n      .from("profiles")\n      .select("id", { count: "exact", head: true })\n      .eq("role", "worker")\n      .eq("verification_status", "verified");\n\n    const { count: suspendedWorkers } = await supabase\n      .from("profiles")\n      .select("id", { count: "exact", head: true })\n      .eq("role", "worker")\n      .eq("verification_status", "suspended");\n\n    const { count: clientsCount } = await supabase`
  );
}

// setStats payload
if (!content.includes("suspendedWorkers: suspendedWorkers")) {
  content = content.replace(
    `setStats({\n      pendingWorkers: pendingWorkers || 0,\n      verifiedWorkers: verifiedWorkers || 0,\n      clientsCount: clientsCount || 0,`,
    `setStats({\n      pendingWorkers: pendingWorkers || 0,\n      verifiedWorkers: verifiedWorkers || 0,\n      suspendedWorkers: suspendedWorkers || 0,\n      clientsCount: clientsCount || 0,`
  );
}

// Overview card for suspended
if (!content.includes("tap to manage")) {
  const clientsCardEnd = `              <p className="text-xs text-gray-500">tap to list</p>\n            </button>\n            <div className="rounded-xl border bg-white p-4 col-span-2">`;
  const withSuspended = `              <p className="text-xs text-gray-500">tap to list</p>\n            </button>\n            <button\n              type="button"\n              onClick={() => setTab("suspended")}\n              className="rounded-xl border bg-white p-4 text-left hover:border-amber-300 transition"\n            >\n              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">\n                <Ban className="h-3.5 w-3.5" /> Suspended\n              </div>\n              <p className="text-2xl font-bold">{stats.suspendedWorkers}</p>\n              <p className="text-xs text-amber-700">tap to manage</p>\n            </button>\n            <div className="rounded-xl border bg-white p-4 col-span-2">`;
  if (content.includes(clientsCardEnd)) {
    content = content.replace(clientsCardEnd, withSuspended);
  }
}

// --- Avatar lightbox on pending cards (for ID verification) ---
if (!content.includes("avatarPreview")) {
  content = content.replace(
    '  const [errorMsg, setErrorMsg] = useState("");',
    '  const [errorMsg, setErrorMsg] = useState("");\n  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);'
  );
}

if (!content.includes("Tap to enlarge") && content.includes("h-14 w-14 rounded-full object-cover border shrink-0 bg-gray-100")) {
  const oldImg = [
    '                    {w.avatar_url ? (',
    '                      // eslint-disable-next-line @next/next/no-img-element',
    '                      <img',
    '                        src={w.avatar_url}',
    '                        alt=""',
    '                        className="h-14 w-14 rounded-full object-cover border shrink-0 bg-gray-100"',
    '                      />',
    '                    ) : (',
    '                      <div className="h-14 w-14 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-lg font-semibold shrink-0">',
    '                        {(w.full_name || "?")[0].toUpperCase()}',
    '                      </div>',
    '                    )}',
  ].join('\n');
  const newImg = [
    '                    {w.avatar_url ? (',
    '                      <button',
    '                        type="button"',
    '                        onClick={() => setAvatarPreview(w.avatar_url)}',
    '                        className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"',
    '                        title="Tap to enlarge"',
    '                      >',
    '                        {/* eslint-disable-next-line @next/next/no-img-element */}',
    '                        <img',
    '                          src={w.avatar_url}',
    '                          alt=""',
    '                          className="h-14 w-14 rounded-full object-cover border bg-gray-100"',
    '                        />',
    '                      </button>',
    '                    ) : (',
    '                      <div className="h-14 w-14 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-lg font-semibold shrink-0">',
    '                        {(w.full_name || "?")[0].toUpperCase()}',
    '                      </div>',
    '                    )}',
  ].join('\n');
  content = content.replace(oldImg, newImg);
}

if (!content.includes("Compare with national ID") && content.includes("avatarPreview")) {
  const endMarker = ['    </div>', '  );', '}'].join('\n');
  const modal = [
    '',
    '      {avatarPreview && (',
    '        <div',
    '          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"',
    '          onClick={() => setAvatarPreview(null)}',
    '          role="dialog"',
    '          aria-modal="true"',
    '          aria-label="Worker photo"',
    '        >',
    '          <div',
    '            className="relative max-w-sm w-full"',
    '            onClick={(e) => e.stopPropagation()}',
    '          >',
    '            <button',
    '              type="button"',
    '              onClick={() => setAvatarPreview(null)}',
    '              className="absolute -top-10 right-0 text-white text-sm font-medium px-3 py-1 rounded-full bg-white/20"',
    '            >',
    '              Close',
    '            </button>',
    '            {/* eslint-disable-next-line @next/next/no-img-element */}',
    '            <img',
    '              src={avatarPreview}',
    '              alt="Worker photo"',
    '              className="w-full rounded-2xl object-cover shadow-xl bg-white"',
    '            />',
    '            <p className="text-center text-white/80 text-xs mt-3">',
    '              Compare with national ID / passport photo',
    '            </p>',
    '          </div>',
    '        </div>',
    '      )}',
    '    </div>',
    '  );',
    '}',
  ].join('\n');
  const idx = content.lastIndexOf(endMarker);
  if (idx !== -1) {
    content = content.slice(0, idx) + modal + content.slice(idx + endMarker.length);
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
  content.includes('setTab("suspended")'),
  "avatarPreview",
  content.includes("avatarPreview")
);
