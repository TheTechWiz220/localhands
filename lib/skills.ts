/** Shared skill & area options for LocalHands (The Gambia) */

export const SKILLS = [
  // Tech & digital
  "Phone & Electronics Repair",
  "Computer Repair",
  "Solar Installation",
  "Electrical",
  "Website Development",
  "Graphic Design",
  "Content Creation",
  "Social Media Management",
  "Video Editing",
  "Photography",
  // Home & trades
  "Plumbing",
  "Construction & Masonry",
  "Painting",
  "Carpentry",
  "Cleaning & Home Help",
  "Tailoring",
  // Mobility & labour
  "Delivery & Errands",
  "Driving",
  "General Labour",
  "Farm Labour",
  "Land Clearing",
  // Services
  "Tutoring",
  "Cooking & Catering",
  "Hair & Beauty",
  "Other",
] as const;

/** Areas people actually use when describing where the job is */
export const AREAS = [
  // Greater Banjul / Kombo
  "Banjul",
  "Bakau",
  "Fajara",
  "Kololi",
  "Senegambia",
  "Bijilo",
  "Brusubi",
  "Serrekunda",
  "Kanifing",
  "Bundung",
  "Tallinding",
  "Lamin",
  "Sukuta",
  "Brufut",
  "Gunjur",
  "Brikama",
  "Busumbala",
  // Upcountry (common hubs)
  "Soma",
  "Farafenni",
  "Basse",
  "Bansang",
  "Other",
] as const;

/** For directory filter — includes All areas */
export const AREA_FILTERS = ["All areas", ...AREAS] as const;
