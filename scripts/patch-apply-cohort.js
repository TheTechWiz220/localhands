/** Add institute cohort field to worker apply form. */
module.exports = function patchApplyCohort(text) {
  if (text.includes("COHORT_OPTIONS") && text.includes("cohort_source: cohortSource")) {
    return text;
  }
  if (!text.includes('from "@/lib/cohort"')) {
    text = text.replace(
      'import { SKILLS, AREAS } from "@/lib/skills";',
      'import { SKILLS, AREAS } from "@/lib/skills";\nimport { COHORT_OPTIONS } from "@/lib/cohort";'
    );
  }
  if (!text.includes("cohortSource")) {
    text = text.replace(
      'const [bio, setBio] = useState("");',
      'const [bio, setBio] = useState("");\n  const [cohortSource, setCohortSource] = useState("");'
    );
  }
  if (!text.includes("setCohortSource(profile.cohort_source)")) {
    text = text.replace(
      "if (profile.whatsapp_phone) setWhatsapp(profile.whatsapp_phone);",
      "if (profile.whatsapp_phone) setWhatsapp(profile.whatsapp_phone);\n        if (profile.cohort_source) setCohortSource(profile.cohort_source);"
    );
  }
  if (!text.includes("cohort_source: cohortSource")) {
    text = text.replace(
      'verification_status: "pending",\n      is_verified: false,',
      'verification_status: "pending",\n      is_verified: false,\n      cohort_source: cohortSource || null,'
    );
  }
  if (!text.includes("Training institute")) {
    const ui = `\n          <div>\n            <label className="text-sm font-medium mb-1.5 block">Training institute (optional)</label>\n            <select\n              value={cohortSource}\n              onChange={(e) => setCohortSource(e.target.value)}\n              className="w-full px-3 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-green-600"\n            >\n              <option value="">None — independent applicant</option>\n              {COHORT_OPTIONS.map((o) => (\n                <option key={o.value} value={o.value}>\n                  {o.label}\n                </option>\n              ))}\n            </select>\n            <p className="text-xs text-gray-500 mt-1">\n              Select if you are applying through GTMI, USET, or GTHI. Shown on your profile after verification.\n            </p>\n          </div>\n`;
    const idx = text.indexOf(">Skills");
    if (idx > 0) {
      const divStart = text.lastIndexOf("<div>", idx);
      if (divStart > 0) {
        text = text.slice(0, divStart) + ui + "\n" + text.slice(divStart);
      }
    }
  }
  return text;
};
