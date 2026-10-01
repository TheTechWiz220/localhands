const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const a = fs.readFileSync(path.join(__dirname, "assemble-b64-a.txt"), "utf8").trim();
const b = fs.readFileSync(path.join(__dirname, "assemble-b64-b.txt"), "utf8").trim();
const src = zlib.inflateSync(Buffer.from(a + b, "base64")).toString("utf8");
const out = path.join(__dirname, "_assemble_body.js");
fs.writeFileSync(out, src);
require(out);
