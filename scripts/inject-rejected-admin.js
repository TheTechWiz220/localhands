/**
 * Inject Rejected tab badge count + overview card into assembled admin page source.
 * Called from assemble-admin.js during prebuild.
 */
module.exports = function injectRejectedAdmin(content) {
  if (!content.includes("rejectedWorkers: number")) {
    content = content.replace(
      `type Stats = {
  pendingWorkers: number;
  verifiedWorkers: number;
  suspendedWorkers: number;
  clientsCount: number;`,
      `type Stats = {
  pendingWorkers: number;
  verifiedWorkers: number;
  suspendedWorkers: number;
  rejectedWorkers: number;
  clientsCount: number;`
    );
  }

  if (!content.includes("count: rejectedWorkers")) {
    content = content.replace(
      `const { count: suspendedWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "suspended");

    const { count: clientsCount } = await supabase`,
      `const { count: suspendedWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "suspended");

    const { count: rejectedWorkers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "worker")
      .eq("verification_status", "rejected");

    const { count: clientsCount } = await supabase`
    );
  }

  if (!content.includes("rejectedWorkers: rejectedWorkers")) {
    content = content.replace(
      `setStats({
      pendingWorkers: pendingWorkers || 0,
      verifiedWorkers: verifiedWorkers || 0,
      suspendedWorkers: suspendedWorkers || 0,
      clientsCount: clientsCount || 0,`,
      `setStats({
      pendingWorkers: pendingWorkers || 0,
      verifiedWorkers: verifiedWorkers || 0,
      suspendedWorkers: suspendedWorkers || 0,
      rejectedWorkers: rejectedWorkers || 0,
      clientsCount: clientsCount || 0,`
    );
  }

  if (!content.includes('id === "rejected"')) {
    content = content.replace(
      `{id === "suspended" &&
              stats &&
              stats.suspendedWorkers > 0 && (
                <span className="ml-1">({stats.suspendedWorkers})</span>
              )}
          </button>`,
      `{id === "suspended" &&
              stats &&
              stats.suspendedWorkers > 0 && (
                <span className="ml-1">({stats.suspendedWorkers})</span>
              )}
            {id === "rejected" &&
              stats &&
              stats.rejectedWorkers > 0 && (
                <span className="ml-1">({stats.rejectedWorkers})</span>
              )}
          </button>`
    );
  }

  if (!content.includes("tap to review")) {
    const suspendedCardEnd = `              <p className="text-xs text-amber-700">tap to manage</p>
            </button>
            <div className="rounded-xl border bg-white p-4 col-span-2">`;
    const withRejectedCard = `              <p className="text-xs text-amber-700">tap to manage</p>
            </button>
            <button
              type="button"
              onClick={() => setTab("rejected")}
              className="rounded-xl border bg-white p-4 text-left hover:border-red-300 transition"
            >
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Ban className="h-3.5 w-3.5" /> Rejected
              </div>
              <p className="text-2xl font-bold">{stats.rejectedWorkers}</p>
              <p className="text-xs text-red-700">tap to review</p>
            </button>
            <div className="rounded-xl border bg-white p-4 col-span-2">`;
    if (content.includes(suspendedCardEnd)) {
      content = content.replace(suspendedCardEnd, withRejectedCard);
    }
  }

  return content;
};
