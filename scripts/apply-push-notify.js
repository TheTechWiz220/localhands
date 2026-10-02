const fs = require("fs");
const path = require("path");
const inject = require("./inject-push-notify");

const root = path.join(__dirname, "..");
const requestPath = path.join(root, "app/request/[workerId]/page.tsx");
const jobsPath = path.join(root, "app/jobs/page.tsx");

if (fs.existsSync(requestPath)) {
  const before = fs.readFileSync(requestPath, "utf8");
  const after = inject(before, "request");
  fs.writeFileSync(requestPath, after);
  console.log("pushNotify request", after.includes("request_to_worker"));
}

if (fs.existsSync(jobsPath)) {
  const before = fs.readFileSync(jobsPath, "utf8");
  const after = inject(before, "jobs");
  fs.writeFileSync(jobsPath, after);
  console.log(
    "pushNotify jobs",
    after.includes("claim_to_client"),
    after.includes("EnableNotifications")
  );
}
