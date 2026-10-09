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
          if (res.statusCode !== 200) {
            reject(new Error("HTTP " + res.statusCode + " for " + url));
            return;
          }
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      })
      .on("error", reject);
  });
}

function patchJobsWhatsApp(text) {
  const old = `  async function enrichJob(j: any, uid: string): Promise<Job> {
    let client_name = "Client";
    let worker_name = "Worker";
    let client_wa: string | null = null;
    let worker_wa: string | null = null;

    if (j.client_id) {
      const { data: c } = await supabase
        .from("profiles")
        .select("full_name, whatsapp_phone")
        .eq("id", j.client_id)
        .maybeSingle();
      if (c?.full_name) client_name = c.full_name;
      if (c?.whatsapp_phone) client_wa = c.whatsapp_phone;
    }

    if (j.worker_id) {
      const { data: w } = await supabase
        .from("profiles")
        .select("full_name, whatsapp_phone")
        .eq("id", j.worker_id)
        .maybeSingle();
      if (w?.full_name) worker_name = w.full_name;
      if (w?.whatsapp_phone) worker_wa = w.whatsapp_phone;
    }

    const other_whatsapp = uid === j.client_id ? worker_wa : client_wa;

    let myRating: number | null = null;
    if (j.status === "completed") {
      const { data: r } = await supabase
        .from("ratings")
        .select("rating")
        .eq("job_id", j.id)
        .eq("from_user_id", uid)
        .maybeSingle();
      if (r?.rating) myRating = r.rating;
    }

    const otherId = uid === j.client_id ? j.worker_id : j.client_id;
    let other_avg_rating = 0;`;

  const neu = `  async function enrichJob(j: any, uid: string): Promise<Job> {
    let client_name = "Client";
    let worker_name = "Worker";
    let other_whatsapp: string | null = null;

    // Partner contact via job_participant_profiles (RLS allows job partners)
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

    // Fallback for admin / if view missing
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
    }

    let myRating: number | null = null;
    if (j.status === "completed") {
      const { data: r } = await supabase
        .from("ratings")
        .select("rating")
        .eq("job_id", j.id)
        .eq("from_user_id", uid)
        .maybeSingle();
      if (r?.rating) myRating = r.rating;
    }

    let other_avg_rating = 0;`;

  if (text.includes("job_participant_profiles")) {
    console.log("jobsWhatsApp already patched");
    return text;
  }
  if (!text.includes(old.slice(0, 80))) {
    console.warn("jobsWhatsApp patch: anchor not found, writing unmodified source");
    return text;
  }
  return text.replace(old, neu);
}

async function restoreJobsPage() {
  const out = path.join(__dirname, "..", "app/jobs/page.tsx");
  // Last known-good jobs page before accidental empty overwrite
  const url =
    "https://raw.githubusercontent.com/TheTechWiz220/localhands/27c97d40aa368918c0760728e9c5740fb01abd16/app/jobs/page.tsx";
  try {
    let text = await httpGet(url);
    if (!text.includes("async function enrichJob")) {
      throw new Error("Downloaded jobs page looks invalid");
    }
    text = patchJobsWhatsApp(text);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, text);
    console.log("restored", "app/jobs/page.tsx", text.length, "whatsAppPatch", text.includes("job_participant_profiles"));
  } catch (e) {
    console.warn("restore jobs failed", e.message);
    // Keep existing file if any
  }
}

const workerB64 = fs.readFileSync(path.join(__dirname, "pages-worker.zlib.b64"), "utf8");
inflateWrite(workerB64, "app/worker/[id]/page.tsx");

const a = fs.readFileSync(path.join(__dirname, "pages-apply-a.b64"), "utf8").trim();
const b = fs.readFileSync(path.join(__dirname, "pages-apply-b.b64"), "utf8").trim();
inflateWrite(a + b, "app/apply/page.tsx");

const p0 = fs.readFileSync(path.join(__dirname, "pages-profile-0.zhex"), "utf8");
const p1 = fs.readFileSync(path.join(__dirname, "pages-profile-1.zhex"), "utf8");
const p2 = fs.readFileSync(path.join(__dirname, "pages-profile-2.zhex"), "utf8");
zhexWrite([p0, p1, p2], "app/profile/page.tsx");

// Jobs must finish before next build step (apply-push-notify)
module.exports = restoreJobsPage();
