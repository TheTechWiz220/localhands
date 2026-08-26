const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const b64Path = path.join(__dirname, "..", "admin-src", "admin.zlib.b64");
const outPath = path.join(__dirname, "..", "app", "admin", "page.tsx");

const b64 = fs.readFileSync(b64Path, "utf8").trim();
const content = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");
fs.writeFileSync(outPath, content);
console.log("assembled admin page", content.length, "chars");
