#!/usr/bin/env node
/** Assemble real LocalHands logo PNGs for Android push (prebuild). */
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
assemble("b", 4, "badge-96.png");
// Also write at public root so Android can load without /icons/ path
const root = path.join(__dirname, "..", "public");
fs.copyFileSync(path.join(iconsDir, "notification-192.png"), path.join(root, "notification-icon.png"));
console.log("wrote public/notification-icon.png");
