const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const a = fs.readFileSync(path.join(__dirname, "assemble-b64-a.txt"), "utf8").trim();
const b = fs.readFileSync(path.join(__dirname, "assemble-b64-b.txt"), "utf8").trim();
const src = zlib.inflateSync(Buffer.from(a + b, "base64")).toString("utf8");
const out = path.join(__dirname, "_assemble_body.js");
fs.writeFileSync(out, src);
require(out);

const adminPath = path.join(__dirname, "../app/admin/page.tsx");

// Languages on pending Verify cards
try {
  let adminContent = fs.readFileSync(adminPath, "utf8");
  adminContent = require("./inject-languages-admin")(adminContent);
  fs.writeFileSync(adminPath, adminContent);
  console.log("languagesInject", adminContent.includes("Languages:"));
} catch (e) {
  console.warn("inject-languages-admin skipped", e.message);
}

// Jobs tab count badge
try {
  let adminContent = fs.readFileSync(adminPath, "utf8");
  if (!adminContent.includes('id === "jobs" && jobs.length')) {
    if (adminContent.includes('{id === "clients" && clientsList.length > 0')) {
      adminContent = adminContent.replace(
        '{id === "clients" && clientsList.length > 0 && (\n              <span className="ml-1">({clientsList.length})</span>\n            )}',
        '{id === "clients" && clientsList.length > 0 && (\n              <span className="ml-1">({clientsList.length})</span>\n            )}\n            {id === "jobs" && jobs.length > 0 && (\n              <span className="ml-1">({jobs.length})</span>\n            )}'
      );
      fs.writeFileSync(adminPath, adminContent);
      console.log("jobsCountBadge", adminContent.includes('id === "jobs" && jobs.length'));
    } else {
      console.warn("jobsCountBadge skipped: clients badge not found");
    }
  } else {
    console.log("jobsCountBadge already present");
  }
} catch (e) {
  console.warn("jobsCountBadge skipped", e.message);
}

// Push on verify / reject / suspend worker
try {
  let adminContent = fs.readFileSync(adminPath, "utf8");
  if (!adminContent.includes("notifyPush")) {
    adminContent = adminContent.replace(
      'from "@/lib/supabase/client";\n',
      'from "@/lib/supabase/client";\nimport { notifyPush } from "@/lib/push/client";\n'
    );
  }
  if (!adminContent.includes("worker_verified")) {
    const needle =
      'setMessage(msg);\n    setWorkers((prev) => prev.filter((w) => w.id !== workerId));';
    const insert =
      'setMessage(msg);\n    if (status === "verified") {\n      void notifyPush("worker_verified", workerId);\n    } else if (status === "rejected") {\n      void notifyPush("worker_rejected", workerId);\n    } else if (status === "suspended") {\n      void notifyPush("worker_suspended", workerId);\n    }\n    setWorkers((prev) => prev.filter((w) => w.id !== workerId));';
    if (adminContent.includes(needle)) {
      adminContent = adminContent.replace(needle, insert);
      fs.writeFileSync(adminPath, adminContent);
      console.log("workerVerifyPush", true);
    } else {
      console.warn("workerVerifyPush skipped: setMessage anchor not found");
    }
  } else {
    console.log("workerVerifyPush already present");
  }
} catch (e) {
  console.warn("workerVerifyPush skipped", e.message);
}
