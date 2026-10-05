#!/usr/bin/env node
/** Assemble LocalHands push icons (prebuild).
 * icon = full-color polished logo (left notification circle)
 * badge = larger white outline hand on transparent (Android status bar)
 */
const fs = require("fs");
const path = require("path");
const iconsDir = path.join(__dirname, "..", "public", "icons");
const partsDir = path.join(__dirname, "icon-parts");
fs.mkdirSync(iconsDir, { recursive: true });
function assemble(prefix, count, outName) {
  let b64 = "";
  for (let i = 0; i < count; i++) {
    b64 += fs.readFileSync(path.join(partsDir, prefix + i + ".txt"), "utf8").trim();
  }
  const out = path.join(iconsDir, outName);
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  console.log("wrote", out, fs.statSync(out).size, "bytes");
}
assemble("n", 12, "notification-192.png");
assemble("b", 7, "badge-96.png");
