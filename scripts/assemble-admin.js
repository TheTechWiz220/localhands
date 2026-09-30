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

if (!content.includes('id === "suspended"')) {
  content = content.replace(
    `{id === "clients" && clientsList.length > 0 && (\n              <span className="ml-1">({clientsList.length})</span>\n            )}\n          </button>`,
    `{id === "clients" && clientsList.length > 0 && (\n              <span className="ml-1">({clientsList.length})</span>\n            )}\n            {id === "suspended" &&\n              stats &&\n              stats.suspendedWorkers > 0 && (\n                <span className="ml-1">({stats.suspendedWorkers})</span>\n              )}\n          </button>`
  );
}

if (!content.includes("suspendedWorkers: number")) {
  content = content.replace(
    `type Stats = {\n  pendingWorkers: number;\n  verifiedWorkers: number;\n  clientsCount: number;`,
    `type Stats = {\n  pendingWorkers: number;\n  verifiedWorkers: number;\n  suspendedWorkers: number;\n  clientsCount: number;`
  );
}

if (!content.includes("count: suspendedWorkers")) {
  content = content.replace(
    `const { count: verifiedWorkers } = await supabase\n      .from("profiles")\n      .select("id", { count: "exact", head: true })\n      .eq("role", "worker")\n      .eq("verification_status", "verified");\n\n    const { count: clientsCount } = await supabase`,
    `const { count: verifiedWorkers } = await supabase\n      .from("profiles")\n      .select("id", { count: "exact", head: true })\n      .eq("role", "worker")\n      .eq("verification_status", "verified");\n\n    const { count: suspendedWorkers } = await supabase\n      .from("profiles")\n      .select("id", { count: "exact", head: true })\n      .eq("role", "worker")\n      .eq("verification_status", "suspended");\n\n    const { count: clientsCount } = await supabase`
  );
}

if (!content.includes("suspendedWorkers: suspendedWorkers")) {
  content = content.replace(
    `setStats({\n      pendingWorkers: pendingWorkers || 0,\n      verifiedWorkers: verifiedWorkers || 0,\n      clientsCount: clientsCount || 0,`,
    `setStats({\n      pendingWorkers: pendingWorkers || 0,\n      verifiedWorkers: verifiedWorkers || 0,\n      suspendedWorkers: suspendedWorkers || 0,\n      clientsCount: clientsCount || 0,`
  );
}

if (!content.includes("tap to manage")) {
  const clientsCardEnd = `              <p className="text-xs text-gray-500">tap to list</p>\n            </button>\n            <div className="rounded-xl border bg-white p-4 col-span-2">`;
  const withSuspended = `              <p className="text-xs text-gray-500">tap to list</p>\n            </button>\n            <button\n              type="button"\n              onClick={() => setTab("suspended")}\n              className="rounded-xl border bg-white p-4 text-left hover:border-amber-300 transition"\n            >\n              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">\n                <Ban className="h-3.5 w-3.5" /> Suspended\n              </div>\n              <p className="text-2xl font-bold">{stats.suspendedWorkers}</p>\n              <p className="text-xs text-amber-700">tap to manage</p>\n            </button>\n            <div className="rounded-xl border bg-white p-4 col-span-2">`;
  if (content.includes(clientsCardEnd)) {
    content = content.replace(clientsCardEnd, withSuspended);
  }
}

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

if (!content.includes("Compare with national ID") && !content.includes("Tap outside to close") && content.includes("avatarPreview")) {
  const endMarker = ['    </div>', '  );', '}'].join('\n');
  const modal = [
    '',
    '      {avatarPreview && (',
    '        <div',
    '          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"',
    '          onClick={() => setAvatarPreview(null)}',
    '          role="dialog"',
    '          aria-modal="true"',
    '          aria-label="Photo preview"',
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
    '              alt="Preview"',
    '              className="w-full rounded-2xl object-contain max-h-[80vh] shadow-xl bg-black"',
    '            />',
    '            <p className="text-center text-white/80 text-xs mt-3">',
    '              Tap outside to close',
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

if (!content.includes('ClientsPanel')) {
  if (content.includes('import SuspendedPanel from "@/components/admin/SuspendedPanel";')) {
    content = content.replace(
      'import SuspendedPanel from "@/components/admin/SuspendedPanel";',
      'import SuspendedPanel from "@/components/admin/SuspendedPanel";\nimport ClientsPanel from "@/components/admin/ClientsPanel";'
    );
  } else {
    content = content.replace(
      'import Link from "next/link";',
      'import Link from "next/link";\nimport SuspendedPanel from "@/components/admin/SuspendedPanel";\nimport ClientsPanel from "@/components/admin/ClientsPanel";'
    );
  }
}

if (!content.includes('<ClientsPanel') && content.includes('tab === "clients"')) {
  const start = content.indexOf('{tab === "clients" && (');
  const jobsTab = content.indexOf('{tab === "jobs" && (', start);
  if (start !== -1 && jobsTab !== -1) {
    content =
      content.slice(0, start) +
      '{tab === "clients" && <ClientsPanel />}\n\n      ' +
      content.slice(jobsTab);
  }
}

if (!content.includes("whatsapp_phone: string | null")) {
  content = content.replace(
    `type PendingWorker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  bio: string | null;
  verification_status: string;
  avatar_url: string | null;
  skills: string[];
  proof_urls: string[];
};`,
    `type PendingWorker = {
  id: string;
  full_name: string | null;
  location_area: string | null;
  bio: string | null;
  verification_status: string;
  avatar_url: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  skills: string[];
  proof_urls: string[];
  certificates: { title: string; media_url: string }[];
};`
  );
}

content = content.replace(
  '.select("id, full_name, location_area, bio, verification_status, avatar_url")\n      .eq("role", "worker")\n      .eq("verification_status", "pending")',
  '.select("id, full_name, location_area, bio, verification_status, avatar_url, whatsapp_phone")\n      .eq("role", "worker")\n      .eq("verification_status", "pending")'
);

if (!content.includes("whatsapp_phone: p.whatsapp_phone")) {
  content = content.replace(
    `enriched.push({
        id: p.id,
        full_name: p.full_name,
        location_area: p.location_area,
        bio: p.bio,
        verification_status: p.verification_status,
        avatar_url: p.avatar_url || null,
        skills: (skills || []).map((s: any) => s.skill),
        proof_urls: (media || []).map((m: any) => m.media_url),
      });`,
    `enriched.push({
        id: p.id,
        full_name: p.full_name,
        location_area: p.location_area,
        bio: p.bio,
        verification_status: p.verification_status,
        avatar_url: p.avatar_url || null,
        whatsapp_phone: p.whatsapp_phone || null,
        email: null,
        skills: (skills || []).map((s: any) => s.skill),
        proof_urls: (media || []).map((m: any) => m.media_url),
        certificates: [],
      });

      const { data: certRows } = await supabase
        .from("worker_certificates")
        .select("title, media_url")
        .eq("worker_id", p.id)
        .order("created_at", { ascending: true });
      if (certRows && certRows.length > 0) {
        enriched[enriched.length - 1].certificates = certRows.map((c: any) => ({
          title: c.title || "Certificate",
          media_url: c.media_url,
        }));
      }`
  );
}

if (!content.includes("/* loadPending contacts */")) {
  content = content.replace(
    `setWorkers(enriched);
  }

  async function loadVerifiedWorkers()`,
    `setWorkers(enriched);

    try {
      const ids = enriched.map((w) => w.id);
      if (ids.length > 0) {
        const res = await fetch("/api/admin/client-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (res.ok) {
          const json = await res.json();
          const map = (json?.emails || {}) as Record<string, string>;
          setWorkers((prev) =>
            prev.map((w) => ({
              ...w,
              email: map[w.id] || w.email || null,
            }))
          );
        }
      }
    } catch {
      /* optional */
    }
  } /* loadPending contacts */

  async function loadVerifiedWorkers()`
  );
}

if (!content.includes("No phone on file")) {
  content = content.replace(
    `<p className="text-sm text-gray-500">
                        {w.location_area || "Area not set"}
                      </p>
                      {w.bio && (
                        <p className="text-sm text-gray-600 mt-1">{w.bio}</p>
                      )}`,
    `<p className="text-sm text-gray-500">
                        {w.location_area || "Area not set"}
                      </p>
                      {w.whatsapp_phone ? (
                        <p className="text-xs text-green-700 mt-0.5">
                          <a
                            href={\`https://wa.me/\${String(w.whatsapp_phone).replace(/\\D/g, "\")}\`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {w.whatsapp_phone}
                          </a>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">No phone on file</p>
                      )}
                      {w.email ? (
                        <p className="text-xs text-gray-600 mt-0.5">
                          <a href={\`mailto:\${w.email}\`} className="underline break-all">
                            {w.email}
                          </a>
                        </p>
                      ) : null}
                      {w.bio && (
                        <p className="text-sm text-gray-600 mt-1">{w.bio}</p>
                      )}`
  );
}

if (!content.includes("Tap to enlarge proof")) {
  content = content.replace(
    `                        {w.proof_urls.map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt={\`Proof \${i + 1}\`}
                            className="aspect-square object-cover rounded-lg border"
                          />
                        ))}`,
    `                        {w.proof_urls.map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAvatarPreview(url)}
                            className="rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            title="Tap to enlarge proof"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={\`Proof \${i + 1}\`}
                              className="aspect-square object-cover rounded-lg border w-full pointer-events-none"
                            />
                          </button>
                        ))}`
  );
}

if (!content.includes("Certificates / training")) {
  content = content.replace(
    `                    ) : (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        No proof photos uploaded yet. Ask them to add photos from
                        Profile before you approve if needed.
                      </p>
                    )}
                  </div>

                  <label className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 cursor-pointer">`,
    `                    ) : (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        No proof photos uploaded yet. Ask them to add photos from
                        Profile before you approve if needed.
                      </p>
                    )}
                  </div>

                  {w.certificates && w.certificates.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Certificates / training</p>
                      <div className="space-y-2">
                        {w.certificates.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAvatarPreview(c.media_url)}
                              className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              title="Tap to enlarge"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={c.media_url}
                                alt={c.title}
                                className="h-14 w-14 rounded-lg object-cover border"
                              />
                            </button>
                            <p className="text-sm text-gray-700 min-w-0 truncate">{c.title}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 cursor-pointer">`
  );
}


// --- Keep generated admin source in sync with the current Rejected workflow ---
if (!content.includes('RejectedPanel')) {
  content = content.replace(
    'import Link from "next/link";',
    'import Link from "next/link";\nimport RejectedPanel from "@/components/admin/RejectedPanel";'
  );
}

content = content.replace(
  '"overview" | "verify" | "workers" | "suspended" | "clients" | "jobs"',
  '"overview" | "verify" | "workers" | "suspended" | "rejected"'
);

const oldAdminTabs = `[
            ["overview", "Overview"],
            ["verify", "Verify"],
            ["workers", "Workers"],
            ["suspended", "Suspended"],
            ["clients", "Clients"],
            ["jobs", "Jobs"],
          ] as const`;
const currentAdminTabs = `[
            ["overview", "Overview"],
            ["verify", "Verify"],
            ["workers", "Workers"],
            ["suspended", "Suspended"],
            ["rejected", "Rejected"],
          ] as const`;
if (content.includes(oldAdminTabs)) {
  content = content.replace(oldAdminTabs, currentAdminTabs);
}

if (!content.includes('{tab === "rejected" && <RejectedPanel />}')) {
  const suspendedPanel = '{tab === "suspended" && <SuspendedPanel />}';
  if (content.includes(suspendedPanel)) {
    content = content.replace(
      suspendedPanel,
      suspendedPanel + '\n\n      {tab === "rejected" && <RejectedPanel />}'
    );
  }
}

fs.writeFileSync(outPath, content);
console.log(
  "assembled",
  content.length,
  "SuspendedPanel",
  content.includes("SuspendedPanel"),
  "pendingPhone",
  content.includes("whatsapp_phone: p.whatsapp_phone"),
  "proofEnlarge",
  content.includes("Tap to enlarge proof"),
  "certs",
  content.includes("Certificates / training")
);
