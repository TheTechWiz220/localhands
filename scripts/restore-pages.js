const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

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

const workerB64 = fs.readFileSync(path.join(__dirname, "pages-worker.zlib.b64"), "utf8");
inflateWrite(workerB64, "app/worker/[id]/page.tsx");

const a = fs.readFileSync(path.join(__dirname, "pages-apply-a.b64"), "utf8").trim();
const b = fs.readFileSync(path.join(__dirname, "pages-apply-b.b64"), "utf8").trim();
inflateWrite(a + b, "app/apply/page.tsx");

const p0 = fs.readFileSync(path.join(__dirname, "pages-profile-0.zhex"), "utf8");
const p1 = fs.readFileSync(path.join(__dirname, "pages-profile-1.zhex"), "utf8");
const p2 = fs.readFileSync(path.join(__dirname, "pages-profile-2.zhex"), "utf8");
zhexWrite([p0, p1, p2], "app/profile/page.tsx");

// Jobs page (includes WhatsApp via job_participant_profiles)
const jobsB64 = fs.readFileSync(path.join(__dirname, "pages-jobs.zlib.b64"), "utf8");
inflateWrite(jobsB64, "app/jobs/page.tsx");
