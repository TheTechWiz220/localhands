const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const https = require("https");

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
  if (text.includes("job_participant_profiles")) return text;
  const marker = "let client_wa: string | null = null;";
  if (!text.includes(marker)) return text;

  // Replace profile-based WA load with job_participant_profiles
  text = text.replace(
    /let client_wa: string \| null = null;\n    let worker_wa: string \| null = null;[\s\S]*?const other_whatsapp = uid === j\.client_id \? worker_wa : client_wa;/
    ,
    `let other_whatsapp: string | null = null;

    const otherId = uid === j.client_id ? j.worker_id : j.client_id;
    if (otherId) {
      const { data: other } = await supabase
        .from("job_participant_profiles")
        .select("full_name, whatsapp_phone")
        .eq("id", otherId)
        .maybeSingle();
      if (other?.full_name) {
        if (uid === j.client_id) worker_name = other.full_name;
        else client_name = other.full_name;
      }
      if (other?.whatsapp_phone) other_whatsapp = other.whatsapp_phone;
    }
    if (otherId && (!other_whatsapp || client_name === "Client" || worker_name === "Worker")) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select("full_name, whatsapp_phone")
        .eq("id", otherId)
        .maybeSingle();
      if (fallback?.full_name) {
        if (uid === j.client_id) worker_name = fallback.full_name;
        else client_name = fallback.full_name;
      }
      if (fallback?.whatsapp_phone) other_whatsapp = fallback.whatsapp_phone;
    }`
  );

  // Remove duplicate otherId declaration later in the function
  text = text.replace(
    /const otherId = uid === j\.client_id \? j\.worker_id : j\.client_id;\n    let other_avg_rating = 0;/,
    "let other_avg_rating = 0;"
  );
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
    const out = path.join(__dirname, "..", "app/jobs/page.tsx");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log(
      "restored app/jobs/page.tsx",
      text.length,
      "wa",
      text.includes("job_participant_profiles")
    );
  } catch (e) {
    console.warn("restore jobs failed", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
