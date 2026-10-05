/**
 * Wire notifyPush into request + jobs + post-job pages at prebuild.
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
        `  return (\n    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">\n      <div className="flex items-start justify-between gap-2">`,
        `  return (\n    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">\n      <EnableNotifications />\n      <div className="flex items-start justify-between gap-2">`
      );
    }
    return content;
  }

  if (kind === "post-job") {
    if (!content.includes("notifyPush")) {
      content = content.replace(
        'import { createClient } from "@/lib/supabase/client";\n',
        'import { createClient } from "@/lib/supabase/client";\nimport { notifyPush } from "@/lib/push/client";\n'
      );
    }
    if (!content.includes("job_ad_to_workers")) {
      // Primary path: status "open" succeeds
      content = content.replace(
        `const { error: insertError } = await supabase.from("job_requests").insert({
      client_id: clientId,
      worker_id: null,
      title: title.trim(),
      description: description.trim(),
      skill_needed: skill,
      location_area: location,
      budget: Number(budget),
      status: "open",
    });

    setSubmitting(false);

    if (insertError) {`,
        `const { data: inserted, error: insertError } = await supabase
      .from("job_requests")
      .insert({
        client_id: clientId,
        worker_id: null,
        title: title.trim(),
        description: description.trim(),
        skill_needed: skill,
        location_area: location,
        budget: Number(budget),
        status: "open",
      })
      .select("id")
      .maybeSingle();

    setSubmitting(false);

    if (insertError) {`
      );
      // Fallback path: status "pending" after open fails
      content = content.replace(
        `const { error: e2 } = await supabase.from("job_requests").insert({
          client_id: clientId,
          worker_id: null,
          title: title.trim(),
          description: description.trim(),
          skill_needed: skill,
          location_area: location,
          budget: Number(budget),
          status: "pending",
        });
        if (e2) {
          setError(
            e2.message.includes("policy")
              ? "Could not post. Check job_requests insert policy in Supabase."
              : e2.message
          );
          return;
        }
        setDone(true);
        return;`,
        `const { data: insertedFallback, error: e2 } = await supabase
          .from("job_requests")
          .insert({
            client_id: clientId,
            worker_id: null,
            title: title.trim(),
            description: description.trim(),
            skill_needed: skill,
            location_area: location,
            budget: Number(budget),
            status: "pending",
          })
          .select("id")
          .maybeSingle();
        if (e2) {
          setError(
            e2.message.includes("policy")
              ? "Could not post. Check job_requests insert policy in Supabase."
              : e2.message
          );
          return;
        }
        if (insertedFallback?.id) {
          void notifyPush("job_ad_to_workers", insertedFallback.id);
        }
        setDone(true);
        return;`
      );
      // Success after primary open insert
      content = content.replace(
        `      return;
    }

    setDone(true);
  }

  if (loading) {`,
        `      return;
    }

    if (inserted?.id) {
      void notifyPush("job_ad_to_workers", inserted.id);
    }

    setDone(true);
  }

  if (loading) {`
      );
    }
    return content;
  }

  return content;
};
