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

    // Status updates: accept / decline / cancel / complete
    if (!content.includes("declined_to_other")) {
      content = content.replace(
        "setMessage(`Job marked as ${status}.`);\n    if (status === \"completed\") {",
        "setMessage(`Job marked as ${status}.`);\n    if (status === \"accepted\") {\n      void notifyPush(\"accepted_to_client\", jobId);\n    }\n    if (status === \"declined\") {\n      void notifyPush(\"declined_to_other\", jobId);\n    }\n    if (status === \"cancelled\") {\n      void notifyPush(\"cancelled_to_other\", jobId);\n    }\n    if (status === \"completed\") {\n      void notifyPush(\"completed_to_other\", jobId);"
      );
      // If accepted was already injected alone, still ensure decline/cancel/complete
      if (!content.includes("declined_to_other")) {
        content = content.replace(
          "if (status === \"accepted\") {\n      void notifyPush(\"accepted_to_client\", jobId);\n    }\n    if (status === \"completed\") {",
          "if (status === \"accepted\") {\n      void notifyPush(\"accepted_to_client\", jobId);\n    }\n    if (status === \"declined\") {\n      void notifyPush(\"declined_to_other\", jobId);\n    }\n    if (status === \"cancelled\") {\n      void notifyPush(\"cancelled_to_other\", jobId);\n    }\n    if (status === \"completed\") {\n      void notifyPush(\"completed_to_other\", jobId);"
        );
      }
    } else if (!content.includes("completed_to_other")) {
      content = content.replace(
        "if (status === \"completed\") {",
        "if (status === \"completed\") {\n      void notifyPush(\"completed_to_other\", jobId);"
      );
    }

    // Legacy: only accepted was injected without decline block
    if (!content.includes("accepted_to_client")) {
      content = content.replace(
        "setMessage(`Job marked as ${status}.`);\n    if (status === \"completed\") {",
        "setMessage(`Job marked as ${status}.`);\n    if (status === \"accepted\") {\n      void notifyPush(\"accepted_to_client\", jobId);\n    }\n    if (status === \"declined\") {\n      void notifyPush(\"declined_to_other\", jobId);\n    }\n    if (status === \"cancelled\") {\n      void notifyPush(\"cancelled_to_other\", jobId);\n    }\n    if (status === \"completed\") {\n      void notifyPush(\"completed_to_other\", jobId);"
      );
    }

    if (!content.includes("counter_to_other")) {
      content = content.replace(
        "setMessage(`Counter sent: ${formatGmd(amount)}. Waiting for the other side.`);\n    if (userId) await loadJobs(userId);",
        "setMessage(`Counter sent: ${formatGmd(amount)}. Waiting for the other side.`);\n    void notifyPush(\"counter_to_other\", job.id);\n    if (userId) await loadJobs(userId);"
      );
    }

    if (!content.includes("counter_accepted_to_other")) {
      content = content.replace(
        "setMessage(\n      `Counter accepted. Price locked at ${formatGmd(job.counter_amount)}. Pay via Wave in the app.`\n    );\n    if (userId) await loadJobs(userId);",
        "setMessage(\n      `Counter accepted. Price locked at ${formatGmd(job.counter_amount)}. Pay via Wave in the app.`\n    );\n    void notifyPush(\"counter_accepted_to_other\", job.id);\n    if (userId) await loadJobs(userId);"
      );
    }

    if (!content.includes("payment_paid_to_worker")) {
      content = content.replace(
        'setMessage("Marked as paid. Waiting for worker to confirm.");\n    if (userId) await loadJobs(userId);',
        'setMessage("Marked as paid. Waiting for worker to confirm.");\n    void notifyPush("payment_paid_to_worker", job.id);\n    if (userId) await loadJobs(userId);'
      );
    }

    if (!content.includes("payment_confirmed_to_client")) {
      content = content.replace(
        'setMessage("Payment confirmed. You can mark the job completed.");\n    if (userId) await loadJobs(userId);',
        'setMessage("Payment confirmed. You can mark the job completed.");\n    void notifyPush("payment_confirmed_to_client", job.id);\n    if (userId) await loadJobs(userId);'
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
        `const jobId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("job_requests").insert({
      id: jobId,
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

    if (insertError) {`
      );
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
        `const fallbackId = crypto.randomUUID();
        const { error: e2 } = await supabase.from("job_requests").insert({
          id: fallbackId,
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
        void notifyPush("job_ad_to_workers", fallbackId);
        setDone(true);
        return;`
      );
      content = content.replace(
        `      return;
    }

    setDone(true);
  }

  if (loading) {`,
        `      return;
    }

    void notifyPush("job_ad_to_workers", jobId);
    setDone(true);
  }

  if (loading) {`
      );
    }
    return content;
  }

  return content;
};
