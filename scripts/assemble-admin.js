const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const b64Path = path.join(__dirname, "..", "admin-src", "admin.zlib.b64");
const outPath = path.join(__dirname, "..", "app", "admin", "page.tsx");

const b64 = fs.readFileSync(b64Path, "utf8").trim();
let content = zlib.inflateSync(Buffer.from(b64, "base64")).toString("utf8");

// Inject Suspended tab + panel into assembled admin
if (!content.includes("SuspendedPanel")) {
  content = content.replace(
    'import Link from "next/link";',
    'import Link from "next/link";\nimport SuspendedPanel from "@/components/admin/SuspendedPanel";'
  );

  content = content.replace(
    '"overview" | "verify" | "workers" | "clients" | "jobs"',
    '"overview" | "verify" | "workers" | "suspended" | "clients" | "jobs"'
  );

  content = content.replace(
    '["workers", "Workers"],\n            ["clients", "Clients"],',
    '["workers", "Workers"],\n            ["suspended", "Suspended"],\n            ["clients", "Clients"],'
  );

  const suspendedPanel = `\n      {tab === "suspended" && <SuspendedPanel />}\n\n`;
  if (!content.includes('tab === "suspended"')) {
    content = content.replace(
      '{tab === "clients" && (',
      suspendedPanel + '      {tab === "clients" && ('
    );
  }
}

fs.writeFileSync(outPath, content);
console.log("assembled admin page", content.length, "chars", "suspended tab:", content.includes("SuspendedPanel"));
