/** Make admin Jobs tab cards open /admin/jobs/[id] detail. */
module.exports = function injectAdminJobLinks(content) {
  if (content.includes("/admin/jobs/${j.id}") || content.includes("`/admin/jobs/${j.id}`")) {
    return content;
  }

  const from = `jobs.map((j) => (
              <div key={j.id} className="rounded-xl border bg-white p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm">{j.title}</h3>
                    <p className="text-xs text-gray-500">
                      {j.client_name} → {j.worker_name} · {j.location_area}
                    </p>
                  </div>
                  {statusBadge(j.status)}
                </div>`;

  const to = `jobs.map((j) => (
              <Link
                key={j.id}
                href={\`/admin/jobs/\${j.id}\`}
                className="block rounded-xl border bg-white p-4 space-y-2 hover:border-green-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm group-hover:text-green-700">{j.title}</h3>
                    <p className="text-xs text-gray-500">
                      {j.client_name} → {j.worker_name} · {j.location_area}
                    </p>
                    <p className="text-xs text-green-700 mt-0.5 font-medium">View full details →</p>
                  </div>
                  {statusBadge(j.status)}
                </div>`;

  if (!content.includes(from)) {
    console.warn("inject-admin-job-links: job card block not found");
    return content;
  }

  content = content.replace(from, to);

  // Close with </Link> instead of outer </div> for that card — match trailing block
  const closeFrom = `{j.wave_reference && (
                  <p className="text-xs text-gray-500 font-mono">
                    Wave: {j.wave_reference}
                  </p>
                )}
                <p className="text-[10px] text-gray-400">
                  {new Date(j.created_at).toLocaleString()}
                </p>
              </div>
            ))`;

  const closeTo = `{j.wave_reference && (
                  <p className="text-xs text-gray-500 font-mono">
                    Wave: {j.wave_reference}
                  </p>
                )}
                <p className="text-[10px] text-gray-400">
                  {new Date(j.created_at).toLocaleString()}
                </p>
              </Link>
            ))`;

  if (content.includes(closeFrom)) {
    content = content.replace(closeFrom, closeTo);
  } else {
    console.warn("inject-admin-job-links: card close block not found");
  }

  return content;
};
