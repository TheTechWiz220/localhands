/**
 * Show spoken languages on admin pending (Verify) cards.
 * Called from assemble-admin.js after main assemble body.
 */
module.exports = function injectLanguagesAdmin(content) {
  if (content.includes("languages: string[]") && content.includes("Languages:")) {
    return content;
  }

  // Type
  if (!content.includes("languages: string[]")) {
    content = content.replace(
      `  skills: string[];
  proof_urls: string[];
  certificates: { title: string; media_url: string }[];
};`,
      `  skills: string[];
  languages: string[];
  proof_urls: string[];
  certificates: { title: string; media_url: string }[];
};`
    );
  }

  // Select column
  if (!content.includes("spoken_languages")) {
    content = content.replace(
      `.select("id, full_name, location_area, bio, verification_status, avatar_url, whatsapp_phone")`,
      `.select("id, full_name, location_area, bio, verification_status, avatar_url, whatsapp_phone, spoken_languages")`
    );
  }

  // Enriched object
  if (!content.includes("languages: Array.isArray")) {
    content = content.replace(
      `        skills: (skills || []).map((s: any) => s.skill),
        proof_urls: (media || []).map((m: any) => m.media_url),
        certificates: [],
      });`,
      `        skills: (skills || []).map((s: any) => s.skill),
        languages: Array.isArray((p as any).spoken_languages)
          ? ((p as any).spoken_languages as string[]).filter(Boolean)
          : [],
        proof_urls: (media || []).map((m: any) => m.media_url),
        certificates: [],
      });`
    );
  }

  // UI after skills badges on pending card
  if (!content.includes("Languages:")) {
    content = content.replace(
      `{w.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {w.skills.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Proof of work</p>`,
      `{w.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {w.skills.map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {w.languages && w.languages.length > 0 && (
                    <p className="text-xs text-gray-600">
                      <span className="text-gray-500">Languages:</span>{" "}
                      {w.languages.join(" · ")}
                    </p>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Proof of work</p>`
    );
  }

  return content;
};
