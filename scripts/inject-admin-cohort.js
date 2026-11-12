/** Load and map profiles.cohort_source for pending workers. */
module.exports = function injectAdminCohort(content) {
  if (content.includes("cohort_source: p.cohort_source")) {
    return content;
  }

  content = content.replace(
    '.select("id, full_name, location_area, bio, verification_status, avatar_url")',
    '.select("id, full_name, location_area, bio, verification_status, avatar_url, cohort_source, whatsapp_phone")'
  );

  // type PendingWorker in assembled page (inline) if present
  content = content.replace(
    "proof_urls: string[];\n};",
    "proof_urls: string[];\n  cohort_source?: string | null;\n};"
  );

  content = content.replace(
    "proof_urls: (media || []).map((m: any) => m.media_url),\n      });",
    "proof_urls: (media || []).map((m: any) => m.media_url),\n        cohort_source: p.cohort_source || null,\n      });"
  );

  return content;
};
