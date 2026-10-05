#!/usr/bin/env node
/** Write notification icons from base64 chunk files (prebuild). */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");
fs.mkdirSync(iconsDir, { recursive: true });
function assemble(prefix, count) {
  let b64 = "";
  for (let i = 0; i < count; i++) {
    b64 += fs.readFileSync(path.join(__dirname, prefix + i + ".b64"), "utf8").trim();
  }
  return Buffer.from(b64, "base64");
}
const notif = assemble("n192_", 6);
const badge = assemble("b96_", 2);
fs.writeFileSync(path.join(iconsDir, "notification-192.png"), notif);
fs.writeFileSync(path.join(root, "public", "notification-icon.png"), notif);
fs.writeFileSync(path.join(iconsDir, "badge-96.png"), badge);
console.log("wrote notification-192.png", notif.length, "bytes");
console.log("wrote notification-icon.png", notif.length, "bytes");
console.log("wrote badge-96.png", badge.length, "bytes");
