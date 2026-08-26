const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const dir = path.join(__dirname, "..", "admin-src");
const outPath = path.join(__dirname, "..", "app", "admin", "page.tsx");

const chunks = [0, 1, 2].map((i) =>
  fs.readFileSync(path.join(dir, `zlib-chunk-${i}.txt`), "utf8").trim()
);
const b64 = chunks.join("");
const content = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");
fs.writeFileSync(outPath, content);
console.log("assembled admin page", content.length, "chars");
