const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "admin-src");
const outPath = path.join(__dirname, "..", "app", "admin", "page.tsx");

const parts = [0, 1, 2, 3].map((i) =>
  fs.readFileSync(path.join(dir, `part-${i}.txt`), "utf8")
);
const content = parts.join("");
fs.writeFileSync(outPath, content);
console.log("assembled admin page", content.length, "chars");
