/**
 * Wire notifyPush into request + jobs pages at prebuild (A+B push notifications).
 */
module.exports = function injectPushNotify(content, kind) {
  if (kind === "request") {
    if (!content.includes("notifyPush")) {
      content = content.replace(
        'import { createClient } from "@/lib/supabase/client";\n',
        'import { createClient } from "@/lib/supabase/client";\nimport { notifyPush } from "@/lib/push/client";\n'
      );
    }
    if (!content.includes("request_to_worker")) {
      content = content.replace(
        `const { error: insertError } = await supabase.from("job_requests").insert({
      client_id: clientId,
      worker_id: workerId,
      title: title.trim(),
      description: description.trim(),
      skill_needed: skill.trim(),
      location_area: location,
      budget: Number(budget),
      status: "pending",
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDone(true);`,
        `const { data: inserted, error: insertError } = await supabase
      .from("job_requests")
      .insert({
        client_id: clientId,
        worker_id: workerId,
        title: title.trim(),
        description: description.trim(),
        skill_needed: skill.trim(),
        location_area: location,
        budget: Number(budget),
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    if (inserted?.id) {
      void notifyPush("request_to_worker", inserted.id);
    }

    setDone(true);`
      );
    }
    return content;
  }

  if (kind === "jobs") {
    if (!content.includes("notifyPush")) {
      content = content.replace(
        'from "@/lib/supabase/client";\n',
        'from "@/lib/supabase/client";\nimport { notifyPush } from "@/lib/push/client";\nimport { EnableNotifications } from "@/components/enable-notifications";\n'
      );
    }
    if (!content.includes("claim_to_client")) {
      content = content.replace(
        'setMessage("You claimed this job. Client can pay via Wave in the app.");\n    await loadJobs(userId);',
        'setMessage("You claimed this job. Client can pay via Wave in the app.");\n    void notifyPush("claim_to_client", job.id);\n    await loadJobs(userId);'
      );
    }
    if (!content.includes("accepted_to_client")) {
      content = content.replace(
        "setMessage(`Job marked as ${status}.`);\n    if (status === \"completed\") {",
        "setMessage(`Job marked as ${status}.`);\n    if (status === \"accepted\") {\n      void notifyPush(\"accepted_to_client\", jobId);\n    }\n    if (status === \"completed\") {"
      );
    }
    if (!content.includes("<EnableNotifications />")) {
      content = content.replace(
        `  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-2">`,
        `  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <EnableNotifications />
      <div className="flex items-start justify-between gap-2">`
      );
    }
    return content;
  }
  return content;
};
