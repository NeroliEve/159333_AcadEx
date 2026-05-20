import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const DEMO_PASSWORD = "asd123";
const DEMO_EMAIL_DOMAIN = "@acadex.test";
const LISTING_IMAGE_BUCKET = "listing-images";
const REQUIRED_STUDY_AREA_SLUGS = [
  "business-commerce",
  "science-mathematics",
  "information-technology",
  "arts-humanities",
  "law",
  "health-medicine",
  "engineering",
  "education",
  "social-sciences",
  "architecture-design",
  "agriculture-environment",
  "music-performing-arts",
];

const DEMO_USERS = [
  ["demo.alex@acadex.test", "demo_alex", "Demo", "Alex", "business", "university-of-auckland", "2"],
  ["demo.mia@acadex.test", "demo_mia", "Demo", "Mia", "computer-science", "massey-university", "3"],
  ["demo.josh@acadex.test", "demo_josh", "Demo", "Josh", "engineering", "university-of-canterbury", "4"],
  ["demo.sophia@acadex.test", "demo_sophia", "Demo", "Sophia", "health-science", "auckland-university-of-technology", "2"],
  ["demo.ethan@acadex.test", "demo_ethan", "Demo", "Ethan", "law", "victoria-university-of-wellington", "3"],
  ["demo.olivia@acadex.test", "demo_olivia", "Demo", "Olivia", "education", "university-of-waikato", "postgraduate"],
  ["demo.noah@acadex.test", "demo_noah", "Demo", "Noah", "science", "university-of-otago", "2"],
  ["demo.ava@acadex.test", "demo_ava", "Demo", "Ava", "arts", "university-of-canterbury", "1"],
  ["demo.liam@acadex.test", "demo_liam", "Demo", "Liam", "social-sciences", "victoria-university-of-wellington", "3"],
  ["demo.emma@acadex.test", "demo_emma", "Demo", "Emma", "design", "auckland-university-of-technology", "2"],
  ["demo.james@acadex.test", "demo_james", "Demo", "James", "agriculture-environment", "lincoln-university", "4"],
  ["demo.charlotte@acadex.test", "demo_charlotte", "Demo", "Charlotte", "music-performing-arts", "university-of-auckland", "1"],
].map(([email, username, firstName, lastName, degreeSlug, universitySlug, yearLevel]) => ({
  degreeSlug,
  email,
  firstName,
  lastName,
  universitySlug,
  username,
  yearLevel,
}));

const LISTING_TEMPLATES = {
  "business-commerce": [
    {
      author: "N. Gregory Mankiw",
      condition: "good",
      courseCode: "ECON101",
      description: "Used for first-year microeconomics. A few highlighted diagrams, but the worked examples are clean.",
      edition: "9th Edition",
      listing_type: "sale_only",
      price: 62,
      publisher: "Cengage",
      title: "Principles of Microeconomics",
      universitySlug: "university-of-auckland",
    },
    {
      author: "Jerry J. Weygandt, Paul D. Kimmel, Donald E. Kieso",
      condition: "like_new",
      courseCode: "ACCTG101",
      description: "Bought new last semester for accounting. No writing inside and the access code was not used.",
      edition: "4th Asia-Pacific Edition",
      listing_type: "sale_only",
      price: 88,
      publisher: "Wiley",
      title: "Accounting Principles",
      universitySlug: "university-of-auckland",
    },
    {
      author: "Philip Kotler, Gary Armstrong",
      condition: "fair",
      courseCode: "MKTG101",
      description: "Older edition but still useful for marketing concepts and tutorial prep.",
      edition: "8th Edition",
      listing_type: "sale_or_trade",
      price: 28,
      publisher: "Pearson",
      title: "Principles of Marketing",
      universitySlug: "university-of-auckland",
      wanted_trade_text: "Happy to exchange for an accounting or finance textbook.",
    },
    {
      author: "Stephen P. Robbins, Mary Coulter",
      condition: "good",
      courseCode: "MNGT101",
      description: "Solid management textbook with tidy notes in pencil. Pickup near campus is easiest.",
      edition: "15th Edition",
      listing_type: "trade_only",
      price: null,
      publisher: "Pearson",
      title: "Management",
      universitySlug: "university-of-waikato",
      wanted_trade_text: "Looking for a current business statistics or economics text.",
    },
  ],
  "science-mathematics": [
    {
      author: "Jane B. Reece, Lisa A. Urry",
      condition: "good",
      courseCode: "BIOSCI101",
      description: "Used for first-year biology. Some highlighting in early chapters, all diagrams intact.",
      edition: "12th Edition",
      listing_type: "sale_only",
      price: 78,
      publisher: "Pearson",
      title: "Campbell Biology",
      universitySlug: "university-of-auckland",
    },
    {
      author: "Daren S. Starnes, Josh Tabor",
      condition: "like_new",
      courseCode: "STATS101",
      description: "Clean copy with no writing. Good for revision and worked examples.",
      edition: "6th Edition",
      listing_type: "sale_only",
      price: 54,
      publisher: "W. H. Freeman",
      title: "The Practice of Statistics",
      universitySlug: "university-of-auckland",
    },
    {
      author: "Theodore L. Brown, H. Eugene LeMay",
      condition: "fair",
      courseCode: "CHEM111",
      description: "Cover has wear, but the content is complete. Useful for first-year chemistry fundamentals.",
      edition: "14th Edition",
      listing_type: "sale_or_trade",
      price: 35,
      publisher: "Pearson",
      title: "Chemistry: The Central Science",
      universitySlug: "university-of-otago",
      wanted_trade_text: "Would trade for biology or statistics material.",
    },
    {
      author: "James Stewart",
      condition: "good",
      courseCode: "MATH102",
      description: "Worked well for engineering maths. Some pencil marks that rub out easily.",
      edition: "8th Edition",
      listing_type: "sale_only",
      price: 46,
      publisher: "Cengage",
      title: "Calculus: Early Transcendentals",
      universitySlug: "university-of-canterbury",
    },
  ],
  "information-technology": [
    {
      author: "Robert C. Martin",
      condition: "like_new",
      courseCode: "COMPSCI101",
      description: "Useful beyond the course. No writing inside and kept in a sleeve.",
      edition: "1st Edition",
      listing_type: "sale_only",
      price: 48,
      publisher: "Prentice Hall",
      title: "Clean Code",
      universitySlug: "university-of-auckland",
    },
    {
      author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
      condition: "good",
      courseCode: "COMPSCI220",
      description: "Used for algorithms. A few sticky tabs remain on graph chapters.",
      edition: "4th Edition",
      listing_type: "sale_only",
      price: 96,
      publisher: "MIT Press",
      status: "pending",
      title: "Introduction to Algorithms",
      universitySlug: "university-of-auckland",
    },
    {
      author: "Michael T. Goodrich, Roberto Tamassia, Michael H. Goldwasser",
      condition: "good",
      courseCode: "COMP261",
      description: "Good reference for data structures. Happy to swap for a database systems text.",
      edition: "6th Edition",
      listing_type: "sale_or_trade",
      price: 58,
      publisher: "Wiley",
      title: "Data Structures and Algorithms in Java",
      universitySlug: "victoria-university-of-wellington",
      wanted_trade_text: "Looking for database systems or software engineering books.",
    },
    {
      author: "Ian Sommerville",
      condition: "fair",
      courseCode: "159333",
      description: "Older software engineering edition, still useful for process and design topics.",
      edition: "10th Edition",
      listing_type: "trade_only",
      price: null,
      publisher: "Pearson",
      title: "Software Engineering",
      universitySlug: "massey-university",
      wanted_trade_text: "Would trade for any programming project or web development textbook.",
    },
  ],
  "arts-humanities": [
    {
      author: "Sylvan Barnet, Hugo Bedau",
      condition: "good",
      courseCode: "ENGL101",
      description: "Useful for essays and tutorials. Minor highlighting in the argument analysis chapters.",
      edition: "13th Edition",
      listing_type: "sale_only",
      price: 24,
      publisher: "Bedford/St. Martin's",
      title: "Critical Thinking, Reading, and Writing",
      universitySlug: "university-of-canterbury",
    },
    {
      author: "Nigel Warburton",
      condition: "like_new",
      courseCode: "PHIL101",
      description: "Short, readable philosophy intro. No writing inside.",
      edition: "5th Edition",
      listing_type: "sale_only",
      price: 22,
      publisher: "Routledge",
      title: "Philosophy: The Basics",
      universitySlug: "university-of-auckland",
    },
    {
      author: "M. H. Abrams, Geoffrey Galt Harpham",
      condition: "fair",
      courseCode: null,
      description: "Older copy with a creased cover. Still a handy reference for literature terms.",
      edition: "11th Edition",
      listing_type: "giveaway",
      price: 0,
      publisher: "Cengage",
      title: "A Glossary of Literary Terms",
    },
    {
      author: "Diana Hacker, Nancy Sommers",
      condition: "good",
      courseCode: "ENGL101",
      description: "Practical writing handbook. Would swap for a history or media studies reader.",
      edition: "9th Edition",
      listing_type: "sale_or_trade",
      price: 18,
      publisher: "Bedford/St. Martin's",
      title: "A Writer's Reference",
      universitySlug: "university-of-canterbury",
      wanted_trade_text: "Open to arts, media, or humanities texts.",
    },
  ],
  law: [
    {
      author: "Stephen Todd",
      condition: "good",
      courseCode: "LAWS202",
      description: "Used for contract law. Light margin notes but all cases are readable.",
      edition: "7th Edition",
      listing_type: "sale_only",
      price: 118,
      publisher: "LexisNexis NZ",
      title: "The Law of Contract in New Zealand",
      universitySlug: "university-of-otago",
    },
    {
      author: "Richard Scragg",
      condition: "fair",
      courseCode: "LAWGEN101",
      description: "Good for legal system basics. Some highlighting from lectures.",
      edition: "6th Edition",
      listing_type: "sale_only",
      price: 42,
      publisher: "LexisNexis NZ",
      title: "New Zealand Legal Method Handbook",
      universitySlug: "university-of-auckland",
    },
    {
      author: "Geoffrey Palmer, Matthew Palmer",
      condition: "good",
      courseCode: "LAWS111",
      description: "Solid public law background text. Pickup available near Kelburn.",
      edition: "4th Edition",
      listing_type: "sale_or_trade",
      price: 64,
      publisher: "Oxford University Press",
      title: "Bridled Power",
      universitySlug: "victoria-university-of-wellington",
      wanted_trade_text: "Would trade for torts or criminal law material.",
    },
    {
      author: "Stephen Todd",
      condition: "poor",
      courseCode: "LAWS301",
      description: "Heavily used but complete. Free to someone who needs a backup copy.",
      edition: "8th Edition",
      listing_type: "giveaway",
      price: 0,
      publisher: "Thomson Reuters",
      title: "The Law of Torts in New Zealand",
      universitySlug: "university-of-otago",
    },
  ],
  "health-medicine": [
    {
      author: "Elaine N. Marieb, Katja Hoehn",
      condition: "good",
      courseCode: "NURS501",
      description: "Used for nursing foundations. Some tabs on anatomy chapters.",
      edition: "11th Edition",
      listing_type: "sale_only",
      price: 92,
      publisher: "Pearson",
      title: "Human Anatomy and Physiology",
      universitySlug: "auckland-university-of-technology",
    },
    {
      author: "Barbara Kozier, Glenora Erb",
      condition: "fair",
      courseCode: "NURS501",
      description: "Large nursing fundamentals text. Cover is worn, pages are clean enough for study.",
      edition: "4th Australian Edition",
      listing_type: "sale_only",
      price: 55,
      publisher: "Pearson Australia",
      title: "Fundamentals of Nursing",
      universitySlug: "auckland-university-of-technology",
    },
    {
      author: "Vinay Kumar, Abul K. Abbas, Jon C. Aster",
      condition: "like_new",
      courseCode: "HEAL202",
      description: "Bought new for pathophysiology and barely used. No highlighting.",
      edition: "10th Edition",
      listing_type: "sale_or_trade",
      price: 110,
      publisher: "Elsevier",
      status: "pending",
      title: "Robbins Basic Pathology",
      universitySlug: "auckland-university-of-technology",
      wanted_trade_text: "Would consider swapping for pharmacology or anatomy texts.",
    },
    {
      author: "Barbara Bates",
      condition: "good",
      courseCode: "MEDSCI142",
      description: "Clinical assessment guide. Helpful for practical sessions and OSCE prep.",
      edition: "13th Edition",
      listing_type: "trade_only",
      price: null,
      publisher: "Wolters Kluwer",
      title: "Bates' Guide to Physical Examination and History Taking",
      universitySlug: "university-of-auckland",
      wanted_trade_text: "Looking for medicine, nursing, or health science texts.",
    },
  ],
  engineering: [
    {
      author: "R. C. Hibbeler",
      condition: "good",
      courseCode: "ENGGEN121",
      description: "Used for engineering mechanics. Worked examples have a few pencil notes.",
      edition: "14th Edition",
      listing_type: "sale_only",
      price: 86,
      publisher: "Pearson",
      title: "Engineering Mechanics: Statics and Dynamics",
      universitySlug: "university-of-auckland",
    },
    {
      author: "John Bird",
      condition: "fair",
      courseCode: "ENGR201",
      description: "Older engineering maths book, still good for practice problems.",
      edition: "8th Edition",
      listing_type: "sale_only",
      price: 38,
      publisher: "Routledge",
      title: "Engineering Mathematics",
      universitySlug: "university-of-canterbury",
    },
    {
      author: "J. P. Holman",
      condition: "like_new",
      courseCode: "ENGR101",
      description: "Clean copy. Useful intro reference for heat transfer concepts.",
      edition: "10th Edition",
      listing_type: "sale_or_trade",
      price: 72,
      publisher: "McGraw Hill",
      title: "Heat Transfer",
      universitySlug: "university-of-canterbury",
      wanted_trade_text: "Would trade for mechanics or electrical engineering material.",
    },
    {
      author: "James K. Wight",
      condition: "good",
      courseCode: "ENGR301",
      description: "Good structural engineering reference. Pickup in Christchurch.",
      edition: "8th Edition",
      listing_type: "trade_only",
      price: null,
      publisher: "Pearson",
      title: "Reinforced Concrete: Mechanics and Design",
      universitySlug: "university-of-canterbury",
      wanted_trade_text: "Looking for project management or engineering design texts.",
    },
  ],
  education: [
    {
      author: "John Hattie",
      condition: "good",
      courseCode: null,
      description: "Great overview for education papers. Some highlighting but still tidy.",
      edition: "1st Edition",
      listing_type: "sale_only",
      price: 36,
      publisher: "Routledge",
      title: "Visible Learning for Teachers",
    },
    {
      author: "Jeannie Oakes, Martin Lipton",
      condition: "like_new",
      courseCode: null,
      description: "No writing inside. Useful for education foundations and reflective assignments.",
      edition: "5th Edition",
      listing_type: "sale_only",
      price: 44,
      publisher: "Routledge",
      title: "Teaching to Change the World",
    },
    {
      author: "Paul Eggen, Don Kauchak",
      condition: "fair",
      courseCode: null,
      description: "Older edition but still useful for classroom strategies.",
      edition: "10th Edition",
      listing_type: "sale_or_trade",
      price: 25,
      publisher: "Pearson",
      title: "Educational Psychology: Windows on Classrooms",
      wanted_trade_text: "Would trade for literacy, curriculum, or teaching practice books.",
    },
    {
      author: "Keith Ballard",
      condition: "good",
      courseCode: null,
      description: "NZ-focused education text. Happy for someone else to use it this semester.",
      edition: "2nd Edition",
      listing_type: "giveaway",
      price: 0,
      publisher: "Dunmore Press",
      title: "Inclusive Education: International Voices on Disability and Justice",
    },
  ],
  "social-sciences": [
    {
      author: "Wayne Weiten",
      condition: "good",
      courseCode: "PSYCH101",
      description: "Used for intro psychology. Some highlighting in memory and development chapters.",
      edition: "11th Edition",
      listing_type: "sale_only",
      price: 58,
      publisher: "Cengage",
      title: "Psychology: Themes and Variations",
      universitySlug: "university-of-auckland",
    },
    {
      author: "Michael W. Passer, Ronald E. Smith",
      condition: "like_new",
      courseCode: "PSYC121",
      description: "Clean psychology text, barely opened after switching papers.",
      edition: "7th Edition",
      listing_type: "sale_only",
      price: 66,
      publisher: "McGraw Hill",
      title: "Psychology: The Science of Mind and Behaviour",
      universitySlug: "victoria-university-of-wellington",
    },
    {
      author: "David Myers, Jean Twenge",
      condition: "fair",
      courseCode: "PSYC325",
      description: "Good for social psychology topics. Cover is scuffed but pages are fine.",
      edition: "13th Edition",
      listing_type: "sale_or_trade",
      price: 32,
      publisher: "McGraw Hill",
      title: "Social Psychology",
      universitySlug: "victoria-university-of-wellington",
      wanted_trade_text: "Open to sociology, psychology, or research methods texts.",
    },
    {
      author: "Alan Bryman",
      condition: "good",
      courseCode: null,
      description: "Helpful for research methods assignments across social science courses.",
      edition: "6th Edition",
      listing_type: "trade_only",
      price: null,
      publisher: "Oxford University Press",
      title: "Social Research Methods",
      wanted_trade_text: "Would trade for statistics or social psychology books.",
    },
  ],
  "architecture-design": [
    {
      author: "Francis D. K. Ching",
      condition: "good",
      courseCode: null,
      description: "Classic design reference. A few page tabs but otherwise tidy.",
      edition: "4th Edition",
      listing_type: "sale_only",
      price: 52,
      publisher: "Wiley",
      title: "Architecture: Form, Space, and Order",
    },
    {
      author: "Ellen Lupton",
      condition: "like_new",
      courseCode: null,
      description: "Clean design book with strong layout examples. No writing inside.",
      edition: "3rd Edition",
      listing_type: "sale_only",
      price: 34,
      publisher: "Princeton Architectural Press",
      title: "Thinking with Type",
    },
    {
      author: "Rob Thompson",
      condition: "fair",
      courseCode: null,
      description: "Useful for product design and materials research. Older but practical.",
      edition: "2nd Edition",
      listing_type: "sale_or_trade",
      price: 29,
      publisher: "Thames & Hudson",
      title: "Manufacturing Processes for Design Professionals",
      wanted_trade_text: "Would trade for typography, UX, or studio materials books.",
    },
    {
      author: "Donald A. Norman",
      condition: "good",
      courseCode: null,
      description: "Readable UX and product design classic. Pickup available on campus.",
      edition: "Revised Edition",
      listing_type: "trade_only",
      price: null,
      publisher: "Basic Books",
      title: "The Design of Everyday Things",
      wanted_trade_text: "Looking for interaction design or visual communication texts.",
    },
  ],
  "agriculture-environment": [
    {
      author: "Peter H. Raven, Linda R. Berg",
      condition: "good",
      courseCode: "ENVS101",
      description: "Used for environmental science. Diagrams are clear, some highlighting.",
      edition: "10th Edition",
      listing_type: "sale_only",
      price: 48,
      publisher: "Wiley",
      title: "Environment",
      universitySlug: "lincoln-university",
    },
    {
      author: "R. J. Haynes",
      condition: "fair",
      courseCode: "AGRI101",
      description: "Practical agriculture reference. Cover has wear from field trips.",
      edition: "2nd Edition",
      listing_type: "sale_only",
      price: 30,
      publisher: "Oxford University Press",
      title: "Agriculture and Soil Management",
      universitySlug: "lincoln-university",
    },
    {
      author: "William P. Cunningham, Mary Ann Cunningham",
      condition: "like_new",
      courseCode: "ENVS101",
      description: "Near-new copy for environmental science. No marks inside.",
      edition: "15th Edition",
      listing_type: "sale_or_trade",
      price: 70,
      publisher: "McGraw Hill",
      title: "Environmental Science: A Global Concern",
      universitySlug: "lincoln-university",
      wanted_trade_text: "Would trade for ecology, soil science, or statistics books.",
    },
    {
      author: "Colin Spedding",
      condition: "good",
      courseCode: "AGRI101",
      description: "Useful background text for sustainable farming systems.",
      edition: "1st Edition",
      listing_type: "trade_only",
      price: null,
      publisher: "Earthscan",
      title: "Agriculture and the Environment",
      universitySlug: "lincoln-university",
      wanted_trade_text: "Looking for environmental management or farm systems material.",
    },
  ],
  "music-performing-arts": [
    {
      author: "Joseph Machlis, Kristine Forney",
      condition: "good",
      courseCode: null,
      description: "Broad music appreciation text. Includes listening guide notes.",
      edition: "13th Edition",
      listing_type: "sale_only",
      price: 26,
      publisher: "W. W. Norton",
      title: "The Enjoyment of Music",
    },
    {
      author: "Robert Cohen",
      condition: "fair",
      courseCode: null,
      description: "Helpful theatre intro. A few highlighted sections from performance studies.",
      edition: "11th Edition",
      listing_type: "sale_only",
      price: 22,
      publisher: "McGraw Hill",
      title: "Theatre",
    },
    {
      author: "Stefan Kostka, Dorothy Payne",
      condition: "like_new",
      courseCode: null,
      description: "Clean music theory copy. Bought new and used for only a few weeks.",
      edition: "8th Edition",
      listing_type: "sale_or_trade",
      price: 64,
      publisher: "McGraw Hill",
      title: "Tonal Harmony",
      wanted_trade_text: "Would trade for music history or performance studies texts.",
    },
    {
      author: "Alison Hodge",
      condition: "good",
      courseCode: null,
      description: "Great performance studies reader. Happy to pass it on.",
      edition: "2nd Edition",
      listing_type: "giveaway",
      price: 0,
      publisher: "Routledge",
      title: "Actor Training",
    },
  ],
};

const AREA_ACCENTS = {
  "agriculture-environment": "#15803d",
  "architecture-design": "#0f766e",
  "arts-humanities": "#7c3aed",
  "business-commerce": "#0f766e",
  education: "#ca8a04",
  engineering: "#dc2626",
  "health-medicine": "#be123c",
  "information-technology": "#2563eb",
  law: "#4338ca",
  "music-performing-arts": "#c026d3",
  "science-mathematics": "#0891b2",
  "social-sciences": "#ea580c",
};

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function parseEnvFile(content, baseEnv = {}) {
  const env = { ...baseEnv };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const equalsIndex = withoutExport.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = withoutExport.slice(0, equalsIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || Object.hasOwn(env, key)) continue;

    const value = stripQuotes(withoutExport.slice(equalsIndex + 1).trim())
      .replaceAll("\\n", "\n")
      .replaceAll("\\r", "\r");

    env[key] = value;
  }

  return env;
}

function loadEnvFiles(cwd = process.cwd()) {
  const existingEnv = { ...process.env };
  let env = { ...existingEnv };

  for (const filename of [".env", ".env.local"]) {
    const filePath = resolve(cwd, filename);
    if (!existsSync(filePath)) continue;

    const parsed = parseEnvFile(readFileSync(filePath, "utf8"), existingEnv);
    env = { ...env, ...parsed };
  }

  return env;
}

export function isLocalSupabaseUrl(supabaseUrl) {
  try {
    const { hostname } = new URL(supabaseUrl);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}

export function validateRunTarget({ allowRemoteFlag, env, supabaseUrl }) {
  if (isLocalSupabaseUrl(supabaseUrl)) return;

  if (allowRemoteFlag && env.ACADEX_ALLOW_REMOTE_DEMO_SEED === "true") return;

  throw new Error(
    [
      "Refusing to seed a non-local Supabase project.",
      "Use a local Supabase URL by default.",
      "For an intentional remote demo seed, pass --allow-remote-demo-seed and set ACADEX_ALLOW_REMOTE_DEMO_SEED=true.",
    ].join(" "),
  );
}

function requireBySlug(rows, tableName) {
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  for (const slug of REQUIRED_STUDY_AREA_SLUGS) {
    if (tableName === "study_areas" && !bySlug.has(slug)) {
      throw new Error(`Missing required study area: ${slug}`);
    }
  }

  return bySlug;
}

function requireRow(map, slug, tableName) {
  const row = map.get(slug);
  if (!row) throw new Error(`Missing ${tableName} row with slug: ${slug}`);
  return row;
}

function getCourseId({ courseCode, courses, universitiesBySlug, universitySlug }) {
  if (!courseCode) return null;

  const universityId = universitySlug ? universitiesBySlug.get(universitySlug)?.id : null;
  const matchingCourse = courses.find((course) => {
    if (course.course_code !== courseCode) return false;
    return universityId ? course.university_id === universityId : true;
  });

  return matchingCourse?.id ?? null;
}

function normalizeListingType(template) {
  if (template.listing_type === "giveaway") return "sale_only";
  return template.listing_type;
}

function normalizePrice(template) {
  if (template.listing_type === "trade_only") return null;
  if (template.listing_type === "giveaway") return 0;
  return template.price;
}

export function buildDemoSeedPlan({ courses, degrees, studyAreas, universities }) {
  const studyAreasBySlug = requireBySlug(studyAreas, "study_areas");
  const degreesBySlug = new Map(degrees.map((degree) => [degree.slug, degree]));
  const universitiesBySlug = new Map(universities.map((university) => [university.slug, university]));

  const users = DEMO_USERS.map((user) => {
    const degree = requireRow(degreesBySlug, user.degreeSlug, "degrees");
    const university = requireRow(universitiesBySlug, user.universitySlug, "universities");

    return {
      degree_id: degree.id,
      degreeSlug: user.degreeSlug,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      university_id: university.id,
      universitySlug: user.universitySlug,
      username: user.username,
      year_level: user.yearLevel,
    };
  });

  const listings = [];

  for (const areaSlug of REQUIRED_STUDY_AREA_SLUGS) {
    const area = requireRow(studyAreasBySlug, areaSlug, "study_areas");
    const templates = LISTING_TEMPLATES[areaSlug];

    if (!templates || templates.length !== 4) {
      throw new Error(`Expected exactly 4 demo listing templates for ${areaSlug}`);
    }

    for (const template of templates) {
      const globalIndex = listings.length;
      const seller = users[globalIndex % users.length];
      const listingType = normalizeListingType(template);
      const price = normalizePrice(template);

      listings.push({
        areaName: area.name,
        author: template.author,
        condition: template.condition,
        course_id: getCourseId({
          courseCode: template.courseCode,
          courses,
          universitiesBySlug,
          universitySlug: template.universitySlug,
        }),
        description: `${template.description} Demo seed listing for local Acadex testing.`,
        edition: template.edition,
        includeImage: true,
        isbn: null,
        listing_type: listingType,
        price,
        publisher: template.publisher,
        sellerEmail: seller.email,
        sellerIndex: globalIndex % users.length,
        show_seller_university: true,
        status: template.status ?? "available",
        study_area_id: area.id,
        studyAreaSlug: areaSlug,
        title: template.title,
        wanted_trade_text:
          listingType === "sale_only"
            ? null
            : template.wanted_trade_text ?? "Open to a relevant textbook exchange.",
      });
    }
  }

  return { listings, users };
}

function createListingPhotoSvg({ accent, areaName, title }) {
  const safeAccent = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#2563eb";
  const titleLength = Math.max(4, Math.min(18, title.length));
  const areaLength = Math.max(6, Math.min(22, areaName.length));

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">',
    "<defs>",
    '<linearGradient id="desk" x1="0" x2="1" y1="0" y2="1">',
    '<stop offset="0%" stop-color="#d8b483"/>',
    '<stop offset="55%" stop-color="#b88755"/>',
    '<stop offset="100%" stop-color="#8b5e34"/>',
    "</linearGradient>",
    '<filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">',
    '<feDropShadow dx="18" dy="24" stdDeviation="18" flood-color="#111827" flood-opacity="0.28"/>',
    "</filter>",
    '<filter id="grain">',
    '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="24"/>',
    '<feColorMatrix type="saturate" values="0"/>',
    '<feComponentTransfer><feFuncA type="table" tableValues="0 0.12"/></feComponentTransfer>',
    "</filter>",
    "</defs>",
    '<rect width="1200" height="900" fill="url(#desk)"/>',
    '<rect width="1200" height="900" filter="url(#grain)" opacity="0.45"/>',
    '<path d="M0 160 C240 116 354 202 590 144 C806 92 950 132 1200 84 L1200 146 L0 222Z" fill="#f4d6a7" opacity="0.22"/>',
    '<path d="M0 696 C210 644 374 724 596 666 C820 608 994 658 1200 604 L1200 900 L0 900Z" fill="#5b341d" opacity="0.18"/>',
    '<g transform="translate(570 438) rotate(-7)" filter="url(#shadow)">',
    '<rect x="-248" y="-314" width="498" height="626" rx="22" fill="#f8fafc"/>',
    `<rect x="-216" y="-282" width="434" height="562" rx="16" fill="${safeAccent}"/>`,
    '<rect x="-174" y="-230" width="350" height="84" rx="10" fill="#ffffff" opacity="0.9"/>',
    '<rect x="-174" y="-104" width="290" height="20" rx="10" fill="#ffffff" opacity="0.55"/>',
    '<rect x="-174" y="-66" width="326" height="20" rx="10" fill="#ffffff" opacity="0.42"/>',
    '<rect x="-174" y="-28" width="244" height="20" rx="10" fill="#ffffff" opacity="0.35"/>',
    '<rect x="-174" y="198" width="350" height="42" rx="8" fill="#0f172a" opacity="0.28"/>',
    `<rect x="-148" y="-198" width="${titleLength * 16}" height="24" rx="12" fill="#0f172a" opacity="0.22"/>`,
    `<rect x="-148" y="206" width="${areaLength * 9}" height="16" rx="8" fill="#ffffff" opacity="0.72"/>`,
    "</g>",
    '<g transform="translate(320 570) rotate(12)" filter="url(#shadow)" opacity="0.95">',
    '<rect x="-148" y="-198" width="294" height="396" rx="16" fill="#e5e7eb"/>',
    '<rect x="-120" y="-170" width="238" height="340" rx="12" fill="#334155"/>',
    `<rect x="-94" y="-136" width="186" height="22" rx="11" fill="${safeAccent}" opacity="0.8"/>`,
    '<rect x="-94" y="-92" width="138" height="16" rx="8" fill="#f8fafc" opacity="0.62"/>',
    '<rect x="-94" y="-60" width="160" height="16" rx="8" fill="#f8fafc" opacity="0.42"/>',
    "</g>",
    '<g transform="translate(848 604) rotate(9)" opacity="0.86" filter="url(#shadow)">',
    '<rect x="-178" y="-88" width="356" height="176" rx="14" fill="#f1f5f9"/>',
    '<rect x="-146" y="-58" width="292" height="28" rx="14" fill="#0f172a" opacity="0.18"/>',
    '<rect x="-146" y="-10" width="218" height="22" rx="11" fill="#0f172a" opacity="0.12"/>',
    '<rect x="-146" y="34" width="260" height="22" rx="11" fill="#0f172a" opacity="0.10"/>',
    "</g>",
    '<circle cx="1000" cy="186" r="42" fill="#ffffff" opacity="0.25"/>',
    '<circle cx="1044" cy="226" r="18" fill="#ffffff" opacity="0.18"/>',
    "</svg>",
  ].join("");
}

export async function createDemoListingPhotoPng({ accent, areaName, title }) {
  return sharp(Buffer.from(createListingPhotoSvg({ accent, areaName, title })))
    .png({ compressionLevel: 8, palette: false })
    .toBuffer();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function requireNoError(result, action) {
  if (result.error) throw new Error(`${action}: ${result.error.message}`);
  return result.data;
}

async function fetchAllDemoUsers(supabase) {
  const demoUsers = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`List auth users: ${error.message}`);

    const users = data?.users ?? [];
    demoUsers.push(...users.filter((user) => user.email?.endsWith(DEMO_EMAIL_DOMAIN)));

    if (users.length < 1000) break;
    page += 1;
  }

  return demoUsers;
}

async function removeListingImagesForUser(supabase, userId) {
  const { data, error } = await supabase.storage
    .from(LISTING_IMAGE_BUCKET)
    .list(userId, { limit: 1000 });

  if (error && !/not found/i.test(error.message)) {
    throw new Error(`List storage objects for ${userId}: ${error.message}`);
  }

  const paths = (data ?? [])
    .filter((item) => item.name)
    .map((item) => `${userId}/${item.name}`);

  if (paths.length === 0) return 0;

  await requireNoError(
    await supabase.storage.from(LISTING_IMAGE_BUCKET).remove(paths),
    `Remove storage objects for ${userId}`,
  );

  return paths.length;
}

async function fetchReferenceData(supabase) {
  const [studyAreasResult, degreesResult, coursesResult, universitiesResult] = await Promise.all([
    supabase.from("study_areas").select("id, name, slug").order("id"),
    supabase.from("degrees").select("id, name, slug, study_area_id").order("id"),
    supabase.from("courses").select("id, course_code, course_name, university_id").order("id"),
    supabase.from("universities").select("id, name, slug").order("id"),
  ]);

  return {
    courses: await requireNoError(coursesResult, "Fetch courses"),
    degrees: await requireNoError(degreesResult, "Fetch degrees"),
    studyAreas: await requireNoError(studyAreasResult, "Fetch study areas"),
    universities: await requireNoError(universitiesResult, "Fetch universities"),
  };
}

async function deleteExistingDemoData(supabase) {
  const existingUsers = await fetchAllDemoUsers(supabase);
  let removedImages = 0;

  for (const user of existingUsers) {
    removedImages += await removeListingImagesForUser(supabase, user.id);
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Delete demo user ${user.email}: ${error.message}`);
  }

  return { removedImages, removedUsers: existingUsers.length };
}

async function createDemoUsers(supabase, users) {
  const createdUsersByEmail = new Map();

  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      password: DEMO_PASSWORD,
      user_metadata: {
        degree_id: String(user.degree_id),
        first_name: user.first_name,
        last_name: user.last_name,
        university_id: String(user.university_id),
        username: user.username,
        year_level: user.year_level,
      },
    });

    if (error) throw new Error(`Create demo user ${user.email}: ${error.message}`);
    if (!data.user) throw new Error(`Create demo user ${user.email}: no user returned`);

    createdUsersByEmail.set(user.email, data.user);
  }

  const profileRows = users.map((user) => {
    const authUser = createdUsersByEmail.get(user.email);
    return {
      account_status: "active",
      degree_id: user.degree_id,
      email: user.email,
      first_name: user.first_name,
      id: authUser.id,
      last_name: user.last_name,
      role: "user",
      university_id: user.university_id,
      username: user.username,
      year_level: user.year_level,
    };
  });

  await requireNoError(
    await supabase.from("profiles").upsert(profileRows, { onConflict: "id" }),
    "Upsert demo profiles",
  );

  return createdUsersByEmail;
}

async function uploadDemoListingPhoto({ listing, listingIndex, supabase, userId }) {
  const image = await createDemoListingPhotoPng({
    accent: AREA_ACCENTS[listing.studyAreaSlug] ?? "#2563eb",
    areaName: listing.areaName,
    title: listing.title,
  });
  const storagePath = `${userId}/demo-${String(listingIndex + 1).padStart(2, "0")}-${slugify(listing.title)}.png`;

  await requireNoError(
    await supabase.storage.from(LISTING_IMAGE_BUCKET).upload(storagePath, image, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: true,
    }),
    `Upload demo listing photo ${storagePath}`,
  );

  const { data } = supabase.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function createDemoListings({ createdUsersByEmail, listings, supabase }) {
  let imageCount = 0;

  for (const [index, listing] of listings.entries()) {
    const seller = createdUsersByEmail.get(listing.sellerEmail);
    if (!seller) throw new Error(`No created demo user found for ${listing.sellerEmail}`);

    const primaryImageUrl = listing.includeImage
      ? await uploadDemoListingPhoto({
          listing,
          listingIndex: index,
          supabase,
          userId: seller.id,
        })
      : null;

    const insertedListing = await requireNoError(
      await supabase
        .from("listings")
        .insert({
          author: listing.author,
          condition: listing.condition,
          course_id: listing.course_id,
          description: listing.description,
          edition: listing.edition,
          isbn: listing.isbn,
          listing_type: listing.listing_type,
          price: listing.price,
          primary_image_url: primaryImageUrl,
          publisher: listing.publisher,
          seller_id: seller.id,
          show_seller_university: listing.show_seller_university,
          status: listing.status,
          study_area_id: listing.study_area_id,
          title: listing.title,
          wanted_trade_text: listing.wanted_trade_text,
        })
        .select("id")
        .single(),
      `Create listing ${listing.title}`,
    );

    if (primaryImageUrl) {
      await requireNoError(
        await supabase.from("listing_images").insert({
          image_url: primaryImageUrl,
          is_primary: true,
          listing_id: insertedListing.id,
          sort_order: 0,
        }),
        `Create listing image row for ${listing.title}`,
      );
      imageCount += 1;
    }
  }

  return { createdImages: imageCount, createdListings: listings.length };
}

function printPlanSummary(plan, references) {
  const countsByArea = new Map();
  for (const listing of plan.listings) {
    countsByArea.set(listing.studyAreaSlug, (countsByArea.get(listing.studyAreaSlug) ?? 0) + 1);
  }

  console.log("Acadex demo seed plan");
  console.log(`- Demo users: ${plan.users.length}`);
  console.log(`- Demo listings: ${plan.listings.length}`);
  console.log(`- Raster listing images: ${plan.listings.filter((listing) => listing.includeImage).length}`);
  console.log(`- Reference rows: ${references.studyAreas.length} study areas, ${references.degrees.length} degrees, ${references.courses.length} courses, ${references.universities.length} universities`);
  console.log("- Listings by study area:");
  for (const slug of REQUIRED_STUDY_AREA_SLUGS) {
    console.log(`  - ${slug}: ${countsByArea.get(slug) ?? 0}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const allowRemoteFlag = args.has("--allow-remote-demo-seed");
  const env = loadEnvFiles();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  validateRunTarget({ allowRemoteFlag, env, supabaseUrl });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const references = await fetchReferenceData(supabase);
  const plan = buildDemoSeedPlan(references);
  printPlanSummary(plan, references);

  if (dryRun) {
    console.log("Dry run only. No Auth users, profiles, listings, listing images, or storage objects were changed.");
    return;
  }

  console.log("Removing existing demo data for emails ending in @acadex.test...");
  const cleanup = await deleteExistingDemoData(supabase);

  console.log("Creating demo Auth users and profiles...");
  const createdUsersByEmail = await createDemoUsers(supabase, plan.users);

  console.log("Creating demo listings and raster listing images...");
  const listingResult = await createDemoListings({
    createdUsersByEmail,
    listings: plan.listings,
    supabase,
  });

  console.log("Acadex demo seed complete.");
  console.log(`- Removed demo users: ${cleanup.removedUsers}`);
  console.log(`- Removed demo storage objects: ${cleanup.removedImages}`);
  console.log(`- Created demo users/profiles: ${plan.users.length}`);
  console.log(`- Created demo listings: ${listingResult.createdListings}`);
  console.log(`- Created raster listing images: ${listingResult.createdImages}`);
  console.log(`- Demo password for every account: ${DEMO_PASSWORD}`);
  console.log("Warning: demo accounts are for local/demo/testing only.");
  console.log(`Example login: ${plan.users[0].email} / ${DEMO_PASSWORD}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
