/**
 * Wire test-campaign push notifications at prebuild.
 */
module.exports = function injectTestNotify() {
  const fs = require("fs");
  const path = require("path");

  function patch(fileRel, transformers) {
    const p = path.join(__dirname, "..", fileRel);
    if (!fs.existsSync(p)) {
      console.warn("inject-test-notify skip missing", fileRel);
      return;
    }
    let text = fs.readFileSync(p, "utf8");
    for (const fn of transformers) text = fn(text);
    fs.writeFileSync(p, text);
    console.log(
      "inject-test-notify",
      fileRel,
      text.includes("test_report_to_admins") || text.includes("test_review_to_tester")
    );
  }

  patch("app/testing/page.tsx", [
    (t) => {
      if (t.includes("notifyPush")) return t;
      return t.replace(
        'import { createClient } from "@/lib/supabase/client";\n',
        'import { createClient } from "@/lib/supabase/client";\nimport { notifyPush } from "@/lib/push/client";\n'
      );
    },
    (t) => {
      if (t.includes("test_report_to_admins")) return t;
      return t.replace(
        'setMessage("Report submitted — thank you.");\n    await load();',
        'setMessage("Report submitted — thank you.");\n    void notifyPush("test_report_to_admins", reportFor.id);\n    await load();'
      );
    },
  ]);

  patch("app/admin/testing/page.tsx", [
    (t) => {
      if (t.includes("notifyPush")) return t;
      return t.replace(
        'import { createClient } from "@/lib/supabase/client";\n',
        'import { createClient } from "@/lib/supabase/client";\nimport { notifyPush } from "@/lib/push/client";\n'
      );
    },
    (t) => {
      if (t.includes("test_review_to_tester")) return t;
      const needle =
        "setMsg(`Marked ${status}`);\n      await load();";
      const insert =
        "setMsg(`Marked ${status}`);\n      if (status === \"accepted\" || status === \"rejected\") {\n        void notifyPush(\"test_review_to_tester\", id);\n      }\n      await load();";
      if (!t.includes(needle)) {
        console.warn("admin setAssignmentStatus anchor not found");
        return t;
      }
      return t.replace(needle, insert);
    },
  ]);
};

if (require.main === module) {
  module.exports();
}
