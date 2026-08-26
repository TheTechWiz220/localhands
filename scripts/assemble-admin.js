const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "admin-src");
const parts = [0, 1, 2, 3].map((i) =>
  fs.readFileSync(path.join(dir, `part-${i}.b64`), "utf8")
);
const content = Buffer.from(parts.join(""), "base64").toString("utf8");
const out = path.join(__dirname, "..", "app", "admin", "page.tsx");
fs.writeFileSync(out, content);
console.log("assembled admin page", content.length, "chars");
