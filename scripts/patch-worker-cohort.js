/** Show institute cohort badge on public worker profile. */
module.exports = function patchWorkerCohort(text) {
  if (text.includes("cohortLabel") && text.includes("cohort_source")) {
    return text;
  }
  if (!text.includes('from "@/lib/cohort"')) {
    text = text.replace(
      'from "@/lib/supabase/client";',
      'from "@/lib/supabase/client";\nimport { cohortLabel } from "@/lib/cohort";'
    );
  }
  text = text.replace(
    '"id, full_name, location_area, bio, verification_status, availability, avatar_url, created_at, id_verified, spoken_languages"',
    '"id, full_name, location_area, bio, verification_status, availability, avatar_url, created_at, id_verified, spoken_languages, cohort_source"'
  );
  if (!text.includes("cohort_source:")) {
    text = text.replace(
      'full_name: profile.full_name || "Worker",',
      'full_name: profile.full_name || "Worker",\n      cohort_source: profile.cohort_source || null,'
    );
  }
  if (!text.includes("cohortLabel(")) {
    text = text.replace(
      '<Badge variant="secondary">In-person check</Badge>',
      `<Badge variant="secondary">In-person check</Badge>
                {cohortLabel(worker.cohort_source) && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    {cohortLabel(worker.cohort_source)}
                  </Badge>
                )}`
    );
  }
  return text;
};
