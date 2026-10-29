const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const https = require("https");
const patchJobsFeeSplit = require("./patch-jobs-fee");

function inflateWrite(b64, outRel) {
  const src = zlib.inflateSync(Buffer.from(b64.trim(), "base64")).toString("utf8");
  const out = path.join(__dirname, "..", outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, src);
  console.log("restored", outRel, src.length);
}

function zhexWrite(hexParts, outRel) {
  const hex = hexParts.map((p) => p.trim()).join("");
  const src = zlib.inflateSync(Buffer.from(hex, "hex")).toString("utf8");
  const out = path.join(__dirname, "..", outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, src);
  console.log("restored", outRel, src.length);
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpGet(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (res.statusCode !== 200) reject(new Error("HTTP " + res.statusCode));
          else resolve(Buffer.concat(chunks).toString("utf8"));
        });
      })
      .on("error", reject);
  });
}

function patchJobsWhatsApp(text) {
  if (!text.includes("jobId={job.id}")) {
    text = text.replace(
      `<JobWhatsAppButton\n                  jobStatus={job.status}\n                  paymentStatus={payStatus}\n                  otherPhone={job.other_whatsapp}\n                  jobTitle={job.title}\n                />`,
      `<JobWhatsAppButton\n                  jobStatus={job.status}\n                  paymentStatus={payStatus}\n                  otherPhone={job.other_whatsapp}\n                  jobTitle={job.title}\n                  jobId={job.id}\n                />`
    );
  }

  if (text.includes("job_participant_profiles")) return text;
  const marker = "let client_wa: string | null = null;";
  if (!text.includes(marker)) return text;

  text = text.replace(
    /let client_wa: string \| null = null;\n    let worker_wa: string \| null = null;[\s\S]*?const other_whatsapp = uid === j\.client_id \? worker_wa : client_wa;/,
    `let other_whatsapp: string | null = null;\n\n    const otherId = uid === j.client_id ? j.worker_id : j.client_id;\n    if (otherId) {\n      const { data: other } = await supabase\n        .from("job_participant_profiles")\n        .select("full_name, whatsapp_phone")\n        .eq("id", otherId)\n        .maybeSingle();\n      if (other?.full_name) {\n        if (uid === j.client_id) worker_name = other.full_name;\n        else client_name = other.full_name;\n      }\n      if (other?.whatsapp_phone) other_whatsapp = other.whatsapp_phone;\n    }\n    if (otherId && (!other_whatsapp || client_name === "Client" || worker_name === "Worker")) {\n      const { data: fallback } = await supabase\n        .from("profiles")\n        .select("full_name, whatsapp_phone")\n        .eq("id", otherId)\n        .maybeSingle();\n      if (fallback?.full_name) {\n        if (uid === j.client_id) worker_name = fallback.full_name;\n        else client_name = fallback.full_name;\n      }\n      if (fallback?.whatsapp_phone) other_whatsapp = fallback.whatsapp_phone;\n    }`
  );

  text = text.replace(
    /const otherId = uid === j\.client_id \? j\.worker_id : j\.client_id;\n    let other_avg_rating = 0;/,
    "let other_avg_rating = 0;"
  );
  return text;
}

function patchJobsClickable(text) {
  if (!text.includes("/jobs/${job.id}") && !text.includes("`/jobs/${job.id}`")) {
    text = text.replace(
      `<div className="flex items-start justify-between gap-2">\n                  <div>\n                    <h3 className="font-semibold">{job.title}</h3>\n                    <p className="text-xs text-gray-500 mt-0.5">\n                      {job.location_area} · Open listing\n                    </p>\n                  </div>\n                  {statusBadge(job.status === "pending" ? "open" : job.status)}\n                </div>\n                <p className="text-sm text-gray-600">{job.description}</p>`,
      `<div className="flex items-start justify-between gap-2">\n                  <Link href={\`/jobs/\${job.id}\`} className="min-w-0 flex-1 block group">\n                    <h3 className="font-semibold group-hover:text-green-700">{job.title}</h3>\n                    <p className="text-xs text-gray-500 mt-0.5">\n                      {job.location_area} · Open listing · Tap for full details\n                    </p>\n                  </Link>\n                  {statusBadge(job.status === "pending" ? "open" : job.status)}\n                </div>\n                <Link href={\`/jobs/\${job.id}\`} className="block">\n                  <p className="text-sm text-gray-600 line-clamp-3">{job.description}</p>\n                  <p className="text-xs text-green-700 mt-1 font-medium">View full details →</p>\n                </Link>`
    );

    text = text.replace(
      `<div className="flex items-start justify-between gap-2">\n                  <div>\n                    <h3 className="font-semibold">{job.title}</h3>`,
      `<div className="flex items-start justify-between gap-2">\n                  <div className="min-w-0 flex-1">\n                    <Link href={\`/jobs/\${job.id}\`} className="block group">\n                      <h3 className="font-semibold group-hover:text-green-700">{job.title}</h3>\n                    </Link>`
    );

    text = text.replace(
      `<p className="text-sm text-gray-600">{job.description}</p>\n\n                <div className="flex flex-wrap gap-2 text-xs items-center">\n                  <Badge variant="secondary">{job.skill_needed}</Badge>`,
      `<Link href={\`/jobs/\${job.id}\`} className="block">\n                  <p className="text-sm text-gray-600 line-clamp-3">{job.description}</p>\n                  <p className="text-xs text-green-700 mt-1 font-medium">View full details →</p>\n                </Link>\n\n                <div className="flex flex-wrap gap-2 text-xs items-center">\n                  <Badge variant="secondary">{job.skill_needed}</Badge>`
    );
  }
  return text;
}

async function main() {
  const workerB64 = fs.readFileSync(path.join(__dirname, "pages-worker.zlib.b64"), "utf8");
  inflateWrite(workerB64, "app/worker/[id]/page.tsx");

  const a = fs.readFileSync(path.join(__dirname, "pages-apply-a.b64"), "utf8").trim();
  const b = fs.readFileSync(path.join(__dirname, "pages-apply-b.b64"), "utf8").trim();
  inflateWrite(a + b, "app/apply/page.tsx");

  const p0 = fs.readFileSync(path.join(__dirname, "pages-profile-0.zhex"), "utf8");
  const p1 = fs.readFileSync(path.join(__dirname, "pages-profile-1.zhex"), "utf8");
  const p2 = fs.readFileSync(path.join(__dirname, "pages-profile-2.zhex"), "utf8");
  zhexWrite([p0, p1, p2], "app/profile/page.tsx");

  const jobsUrl =
    "https://raw.githubusercontent.com/TheTechWiz220/localhands/27c97d40aa368918c0760728e9c5740fb01abd16/app/jobs/page.tsx";
  try {
    let text = await httpGet(jobsUrl);
    text = patchJobsWhatsApp(text);
    text = patchJobsClickable(text);
    text = patchJobsFeeSplit(text);
    const out = path.join(__dirname, "..", "app/jobs/page.tsx");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log(
      "restored app/jobs/page.tsx",
      text.length,
      "jobId",
      text.includes("jobId={job.id}"),
      "wa",
      text.includes("job_participant_profiles"),
      "detailLink",
      text.includes("/jobs/${job.id}"),
      "clientPays",
      text.includes("fees.clientPays")
    );
  } catch (e) {
    console.warn("restore jobs failed", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
