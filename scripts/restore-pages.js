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

const workerB64 = fs.readFileSync(path.join(__dirname, "pages-worker.zlib.b64"), "utf8");
inflateWrite(workerB64, "app/worker/[id]/page.tsx");

const a = fs.readFileSync(path.join(__dirname, "pages-apply-a.b64"), "utf8").trim();
const b = fs.readFileSync(path.join(__dirname, "pages-apply-b.b64"), "utf8").trim();
inflateWrite(a + b, "app/apply/page.tsx");
