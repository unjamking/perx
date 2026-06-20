const Database = require("better-sqlite3");
const path = require("path");

// DB path overridable for tests (PERX_DB=:memory: for an isolated in-memory DB).
const DB_PATH = process.env.PERX_DB || path.join(__dirname, "..", "perx.db");
const db = new Database(DB_PATH);
if (DB_PATH !== ":memory:") db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY, name TEXT, budget_per_employee INTEGER,
  tagline TEXT, logo_emoji TEXT, brand_color TEXT, mission TEXT,
  perks_headline TEXT, glassdoor_rating REAL
);
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY, company_id INTEGER, name TEXT, budget_override INTEGER
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT, role TEXT, company_id INTEGER,
  department_id INTEGER, budget_total INTEGER DEFAULT 0, budget_spent INTEGER DEFAULT 0,
  email TEXT UNIQUE, password_hash TEXT, provider_id INTEGER,
  must_change_password INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY, user_id INTEGER, company_name TEXT, category TEXT, description TEXT,
  logo_emoji TEXT, tagline TEXT, address TEXT, phone TEXT, lat REAL, lng REAL
);
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY, provider_id INTEGER, title TEXT, description TEXT,
  category TEXT, price_all INTEGER, is_active INTEGER DEFAULT 1, is_featured INTEGER DEFAULT 0,
  discount_pct INTEGER DEFAULT 0, capacity INTEGER DEFAULT 0,
  deal_ends TEXT, target_group TEXT
);
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY, provider_id INTEGER, title TEXT, description TEXT, total_price_all INTEGER
);
CREATE TABLE IF NOT EXISTS package_offers (
  package_id INTEGER, offer_id INTEGER
);
CREATE TABLE IF NOT EXISTS selections (
  id INTEGER PRIMARY KEY, employee_id INTEGER, status TEXT DEFAULT 'pending',
  total_amount INTEGER, gift_to INTEGER, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS selection_items (
  id INTEGER PRIMARY KEY, selection_id INTEGER, offer_id INTEGER, price_all INTEGER
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY, selection_id INTEGER, provider_id INTEGER,
  amount_all INTEGER, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY, company_id INTEGER, title TEXT, description TEXT,
  category TEXT, bonus_all INTEGER, deadline TEXT, is_active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS challenge_progress (
  id INTEGER PRIMARY KEY, challenge_id INTEGER, employee_id INTEGER, completed INTEGER DEFAULT 0
);
-- Peer gifting: one employee transfers reward credit to a colleague.
CREATE TABLE IF NOT EXISTS gifts (
  id INTEGER PRIMARY KEY, from_employee INTEGER, to_employee INTEGER,
  amount_all INTEGER, note TEXT, created_at TEXT DEFAULT (datetime('now'))
);
-- Flash drops: limited-time perks HR schedules to boost engagement.
CREATE TABLE IF NOT EXISTS flash_drops (
  id INTEGER PRIMARY KEY, company_id INTEGER, title TEXT, description TEXT,
  offer_id INTEGER, bonus_all INTEGER, starts_at TEXT, ends_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
-- Auto-approval guardrails: selections under threshold in allowed categories skip manual review.
CREATE TABLE IF NOT EXISTS auto_rules (
  id INTEGER PRIMARY KEY, company_id INTEGER, category TEXT,
  max_amount INTEGER, enabled INTEGER DEFAULT 1
);
-- Provider matching: log employee searches/concierge queries to surface vendor demand.
CREATE TABLE IF NOT EXISTS vendor_searches (
  id INTEGER PRIMARY KEY, company_id INTEGER, employee_id INTEGER,
  query TEXT, category TEXT, matched INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
);
-- Employer: benefit policy rules (category enabled + per-category cap).
CREATE TABLE IF NOT EXISTS benefit_policies (
  id INTEGER PRIMARY KEY, company_id INTEGER, category TEXT,
  enabled INTEGER DEFAULT 1, max_per_month INTEGER
);
-- Employer: provider partnerships (which vendors a company has contracted).
CREATE TABLE IF NOT EXISTS partnerships (
  id INTEGER PRIMARY KEY, company_id INTEGER, provider_id INTEGER,
  status TEXT DEFAULT 'active', discount_pct INTEGER DEFAULT 0, since TEXT DEFAULT (datetime('now'))
);
-- Employer: multi-country offices.
CREATE TABLE IF NOT EXISTS offices (
  id INTEGER PRIMARY KEY, company_id INTEGER, country TEXT, city TEXT,
  currency TEXT, fx_to_all REAL DEFAULT 1, headcount INTEGER, budget_per_employee INTEGER, is_hq INTEGER DEFAULT 0
);
-- Employer: recruitment perk package shown to candidates.
CREATE TABLE IF NOT EXISTS recruitment_perks (
  id INTEGER PRIMARY KEY, company_id INTEGER, title TEXT, description TEXT, highlight INTEGER DEFAULT 0
);
-- Provider: employee reviews of offers + provider replies.
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY, provider_id INTEGER, offer_id INTEGER, employee_id INTEGER,
  rating INTEGER, comment TEXT, reply TEXT, created_at TEXT DEFAULT (datetime('now'))
);
-- Employee: saved/bookmarked offers.
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY, employee_id INTEGER, offer_id INTEGER, created_at TEXT DEFAULT (datetime('now'))
);
-- Employer: calendar of meetings with service providers.
CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY, company_id INTEGER, provider_id INTEGER,
  title TEXT, date TEXT, time TEXT, location TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now'))
);
-- Audit trail: who changed what (budgets, policies, approvals…).
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY, company_id INTEGER, actor_id INTEGER, actor_name TEXT,
  actor_role TEXT, action TEXT, detail TEXT, created_at TEXT DEFAULT (datetime('now'))
);
-- Employee: recurring/auto-renew subscriptions to an offer.
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY, employee_id INTEGER, offer_id INTEGER, price_all INTEGER,
  active INTEGER DEFAULT 1, next_run TEXT, last_run TEXT, created_at TEXT DEFAULT (datetime('now'))
);
-- Push: Expo push tokens per user (for deal + approval notifications).
CREATE TABLE IF NOT EXISTS push_tokens (
  id INTEGER PRIMARY KEY, user_id INTEGER, token TEXT UNIQUE, created_at TEXT DEFAULT (datetime('now'))
);
`);

function seed() {
  const tables = ["push_tokens","subscriptions","audit_log","meetings","bookmarks","reviews","recruitment_perks","offices","partnerships","benefit_policies",
    "vendor_searches","auto_rules","flash_drops","gifts",
    "challenge_progress","challenges","transactions","selection_items",
    "selections","package_offers","packages","offers","providers","users","departments","companies"];
  for (const t of tables) db.exec(`DELETE FROM ${t}`);

  db.prepare(`INSERT INTO companies
    (id,name,budget_per_employee,tagline,logo_emoji,brand_color,mission,perks_headline,glassdoor_rating)
    VALUES (1,?,10000,?,?,?,?,?,?)`).run(
    "TechTirana SH.P.K",
    "Building the Balkans' best software, together.",
    "🌊", "#215E68",
    "We invest in our people first — flexible benefits in Albanian Lek, real wellness, real growth.",
    "Up to 12,000 ALL/month in flexible perks", 4.4);

  const dept = db.prepare("INSERT INTO departments (company_id,name,budget_override) VALUES (1,?,?)");
  const eng = dept.run("Engineering", 12000).lastInsertRowid;
  const sales = dept.run("Sales", 10000).lastInsertRowid;
  const design = dept.run("Design", 10000).lastInsertRowid;
  const marketing = dept.run("Marketing", 10000).lastInsertRowid;

  const user = db.prepare(
    "INSERT INTO users (name,role,company_id,department_id,budget_total,budget_spent) VALUES (?,?,1,?,?,?)");
  // budget_total = dept budget, budget_spent seeded so "left" shows a real number
  const arta = user.run("Arta", "employee", eng, 12000, 5800).lastInsertRowid;   // 6,200 left per spec
  const besnik = user.run("Besnik", "employee", sales, 10000, 2000).lastInsertRowid;
  const drita = user.run("Drita", "employee", design, 10000, 8500).lastInsertRowid; // <20% -> red
  // Extra demo employees so tables, charts and sentiment look populated.
  const enkel = user.run("Enkel", "employee", eng, 12000, 11200).lastInsertRowid;   // maxed-ish
  const flora = user.run("Flora", "employee", marketing, 10000, 4200).lastInsertRowid;
  const genta = user.run("Genta", "employee", sales, 10000, 0).lastInsertRowid;      // inactive, 0 spent
  const ilir = user.run("Ilir", "employee", design, 10000, 6500).lastInsertRowid;
  const jeta = user.run("Jeta", "employee", marketing, 10000, 9800).lastInsertRowid; // red
  const klara = user.run("Klara", "employee", eng, 12000, 3300).lastInsertRowid;
  const employerId = user.run("Manager", "employer", eng, 0, 0).lastInsertRowid;
  user.run("Elira", "hr", eng, 0, 0);

  // Providers + their login users
  const provData = [
    ["Green Gym Tirana", "💪 Fitness", "Premium gym in the heart of Tirana", [
      ["Monthly Membership", "Full access, all classes", 3500],
      ["3-Month Membership", "Save with a quarter pass", 9000],
    ]],
    ["Mullixhiu Restaurant", "🍽️ Food", "Farm-to-table Albanian cuisine", [
      ["Lunch Voucher x10", "Ten weekday lunches", 4000],
      ["Business Dinner x5", "Five dinners for client meetings", 6000],
    ]],
    ["Zen Spa Tirana", "🧘 Wellness", "Massage and relaxation", [
      ["Relaxing Massage", "60-minute full body massage", 2800],
      ["Monthly Wellness", "Unlimited spa access for a month", 7500],
    ]],
    ["Juvenilja Travel", "✈️ Travel", "Weekend escapes across Albania", [
      ["Weekend Trip", "Two nights on the Riviera", 8000],
      ["City Break", "Long weekend abroad", 12000],
    ]],
    ["ALBtelecom", "📱 Telecom", "Mobile data plans", [
      ["Data 10GB", "Monthly 10GB bundle", 1500],
      ["Premium 50GB", "Monthly 50GB unlimited calls", 3500],
    ]],
    ["Shkolla Digjitale", "📚 Education", "Online courses and certifications", [
      ["Course Credit", "Credit for any single course", 5000],
      ["Annual Pass", "Full year, all courses", 15000],
    ]],
  ];

  // Provider profile extras keyed by name (logo, tagline, address, phone, lat, lng — real Tirana coords).
  const provProfile = {
    "Green Gym Tirana": ["💪", "Stronger every day.", "Rr. Myslym Shyri 12, Tirana", "+355 69 200 1001", 41.3245, 19.8125],
    "Mullixhiu Restaurant": ["🍽️", "Farm to table, the Albanian way.", "Parku i Madh, Tirana", "+355 69 200 1002", 41.3128, 19.8190],
    "Zen Spa Tirana": ["🧘", "Unwind. Recharge. Repeat.", "Blloku, Rr. Pjeter Bogdani 8, Tirana", "+355 69 200 1003", 41.3198, 19.8165],
    "Juvenilja Travel": ["✈️", "Discover Albania & beyond.", "Rr. e Durrësit 45, Tirana", "+355 69 200 1004", 41.3280, 19.8090],
    "ALBtelecom": ["📱", "Always connected.", "Autostrada Tiranë-Durrës, Km 7", "+355 69 200 1005", 41.3350, 19.7900],
    "Shkolla Digjitale": ["📚", "Learn skills that matter.", "Rr. Kavajës 21, Tirana", "+355 69 200 1006", 41.3210, 19.8050],
  };

  const insUser = db.prepare("INSERT INTO users (name,role,company_id) VALUES (?,?,1)");
  const insProv = db.prepare("INSERT INTO providers (user_id,company_name,category,description,logo_emoji,tagline,address,phone,lat,lng) VALUES (?,?,?,?,?,?,?,?,?,?)");
  const insOffer = db.prepare(
    "INSERT INTO offers (provider_id,title,description,category,price_all,is_featured,discount_pct,capacity,deal_ends,target_group) VALUES (?,?,?,?,?,?,?,?,?,?)");
  const offerIds = {};
  const provIds = {};
  for (const [name, cat, desc, offers] of provData) {
    const uid = insUser.run(name, "provider").lastInsertRowid;
    const [emoji, tagline, address, phone, lat, lng] = provProfile[name];
    const pid = insProv.run(uid, name, cat, desc, emoji, tagline, address, phone, lat, lng).lastInsertRowid;
    provIds[name] = pid;
    offers.forEach(([title, d, price], i) => {
      const featured = (name === "Zen Spa Tirana" && i === 0) ? 1 : 0;
      // Zen Spa (demo provider) gets a discount, capacity, a live limited deal, and targeting.
      const isZen = name === "Zen Spa Tirana";
      const discount = isZen && i === 1 ? 20 : 0;
      const capacity = isZen ? (i === 0 ? 40 : 15) : 0;
      const dealEnds = isZen && i === 1 ? "2026-06-30" : null;
      const target = isZen && i === 1 ? "🧘 Wellness" : null;
      offerIds[title] = { id: insOffer.run(pid, title, d, cat, price, featured, discount, capacity, dealEnds, target).lastInsertRowid, price };
    });
  }

  // Provider package: Work & Wellness (owned by Zen Spa, demo provider)
  const pkgId = db.prepare(
    "INSERT INTO packages (provider_id,title,description,total_price_all) VALUES (?,?,?,?)")
    .run(provIds["Zen Spa Tirana"], "Work & Wellness", "Green Gym Monthly + Zen Spa Massage", 6300).lastInsertRowid;
  const linkPkg = db.prepare("INSERT INTO package_offers (package_id,offer_id) VALUES (?,?)");
  linkPkg.run(pkgId, offerIds["Monthly Membership"].id);
  linkPkg.run(pkgId, offerIds["Relaxing Massage"].id);
  // Second Zen Spa package so packages tab isn't single-row.
  const pkg2 = db.prepare("INSERT INTO packages (provider_id,title,description,total_price_all) VALUES (?,?,?,?)")
    .run(provIds["Zen Spa Tirana"], "Total Reset", "Monthly Wellness + Relaxing Massage", 9500).lastInsertRowid;
  linkPkg.run(pkg2, offerIds["Monthly Wellness"].id);
  linkPkg.run(pkg2, offerIds["Relaxing Massage"].id);

  const insChal = db.prepare(`INSERT INTO challenges (company_id,title,description,category,bonus_all,deadline)
    VALUES (1,?,?,?,?,?)`);
  const wellnessChallenge = insChal.run(
    "Wellness Month", "Complete 3 fitness sessions, earn 2,000 ALL bonus each", "💪 Fitness", 2000, "2026-07-19").lastInsertRowid;
  const stepsChallenge = insChal.run(
    "10k Steps Daily", "Hit 10,000 steps a day for two weeks as a team.", "💪 Fitness", 1500, "2026-07-05").lastInsertRowid;
  const mindfulChallenge = insChal.run(
    "Mindful June", "Book a wellness or spa session this month.", "🧘 Wellness", 1000, "2026-06-30").lastInsertRowid;

  // Challenge participation (real signal for sentiment + completion bars)
  const insProg = db.prepare("INSERT INTO challenge_progress (challenge_id,employee_id,completed) VALUES (?,?,?)");
  insProg.run(wellnessChallenge, arta, 1);
  insProg.run(wellnessChallenge, besnik, 1);
  insProg.run(wellnessChallenge, drita, 0);
  insProg.run(wellnessChallenge, enkel, 1);
  insProg.run(wellnessChallenge, ilir, 0);
  insProg.run(stepsChallenge, arta, 1);
  insProg.run(stepsChallenge, flora, 1);
  insProg.run(stepsChallenge, klara, 0);
  insProg.run(stepsChallenge, jeta, 0);
  insProg.run(mindfulChallenge, drita, 1);
  insProg.run(mindfulChallenge, ilir, 1);
  insProg.run(mindfulChallenge, arta, 0);

  // Real approved selections + transactions across the last months so forecasting,
  // analytics trend, and category breakdown all run on actual data (no synthetic numbers).
  const insSel = db.prepare(
    "INSERT INTO selections (employee_id,status,total_amount,created_at) VALUES (?,?,?,?)");
  const insSelItem = db.prepare("INSERT INTO selection_items (selection_id,offer_id,price_all) VALUES (?,?,?)");
  const insTx = db.prepare(
    "INSERT INTO transactions (selection_id,provider_id,amount_all,status,created_at) VALUES (?,?,?,'paid',?)");
  const provOf = db.prepare("SELECT provider_id FROM offers WHERE id = ?");

  const purchase = (emp, offerTitle, isoDate, status = "approved") => {
    const o = offerIds[offerTitle];
    const selId = insSel.run(emp, status, o.price, isoDate).lastInsertRowid;
    insSelItem.run(selId, o.id, o.price);
    if (status === "approved") insTx.run(selId, provOf.get(o.id).provider_id, o.price, isoDate);
    return selId;
  };

  // Spread history Jan–Jun 2026 → drives real monthly trend & forecast slope.
  purchase(arta, "Monthly Membership", "2026-01-14 10:00:00");
  purchase(arta, "Relaxing Massage", "2026-02-09 11:00:00");
  purchase(besnik, "Lunch Voucher x10", "2026-02-20 09:30:00");
  purchase(arta, "Course Credit", "2026-03-05 14:00:00");
  purchase(drita, "Monthly Wellness", "2026-03-22 16:00:00");
  purchase(besnik, "Data 10GB", "2026-04-02 08:00:00");
  purchase(arta, "Monthly Membership", "2026-04-18 10:00:00");
  purchase(drita, "Relaxing Massage", "2026-05-07 13:00:00");
  purchase(besnik, "Business Dinner x5", "2026-05-25 19:00:00");
  purchase(arta, "Monthly Wellness", "2026-06-03 12:00:00");
  purchase(drita, "Weekend Trip", "2026-06-15 09:00:00");
  // More history from the extra employees → fuller charts & tables.
  purchase(enkel, "3-Month Membership", "2026-01-22 10:00:00");
  purchase(flora, "Lunch Voucher x10", "2026-02-14 12:00:00");
  purchase(enkel, "Premium 50GB", "2026-03-11 09:00:00");
  purchase(ilir, "Relaxing Massage", "2026-03-28 15:00:00");
  purchase(jeta, "City Break", "2026-04-09 08:00:00");
  purchase(flora, "Annual Pass", "2026-04-21 11:00:00");
  purchase(ilir, "Monthly Membership", "2026-05-12 10:00:00");
  purchase(klara, "Data 10GB", "2026-05-19 08:30:00");
  purchase(jeta, "Business Dinner x5", "2026-06-06 19:30:00");
  purchase(enkel, "Course Credit", "2026-06-11 14:00:00");
  // A few pending so employer approvals queue has volume.
  purchase(besnik, "Premium 50GB", "2026-06-18 10:00:00", "pending");
  purchase(flora, "Weekend Trip", "2026-06-19 09:00:00", "pending");
  purchase(klara, "Relaxing Massage", "2026-06-19 16:00:00", "pending");

  // Peer gifts (real transfers between colleagues)
  const insGift = db.prepare("INSERT INTO gifts (from_employee,to_employee,amount_all,note,created_at) VALUES (?,?,?,?,?)");
  insGift.run(arta, drita, 1000, "Thanks for covering my shift! 🙌", "2026-06-10 15:00:00");
  insGift.run(besnik, arta, 500, "Happy birthday!", "2026-06-12 09:00:00");
  insGift.run(flora, jeta, 750, "Great campaign work! 🚀", "2026-06-13 10:00:00");
  insGift.run(enkel, klara, 300, "Coffee's on me ☕", "2026-06-14 08:30:00");
  insGift.run(ilir, drita, 1200, "Welcome to the design team!", "2026-06-16 13:00:00");

  // Flash drops: limited-time boosts (one live, one upcoming, one ended).
  const insDrop = db.prepare(`INSERT INTO flash_drops (company_id,title,description,offer_id,bonus_all,starts_at,ends_at)
    VALUES (1,?,?,?,?,?,?)`);
  insDrop.run("Summer Spa Flash", "Extra 1,500 ALL toward any wellness perk — this week only.",
    offerIds["Monthly Wellness"].id, 1500, "2026-06-16", "2026-06-23");
  insDrop.run("Fitness Kickstart", "1,000 ALL bonus on any gym membership.",
    offerIds["Monthly Membership"].id, 1000, "2026-06-22", "2026-06-29");
  insDrop.run("Lunch Week", "Double rewards on food perks.",
    offerIds["Lunch Voucher x10"].id, 800, "2026-06-01", "2026-06-08");

  // Auto-approval guardrails (low-risk categories under a cap)
  const insRule = db.prepare("INSERT INTO auto_rules (company_id,category,max_amount,enabled) VALUES (1,?,?,?)");
  insRule.run("📱 Telecom", 2000, 1);
  insRule.run("🍽️ Food", 4500, 1);
  insRule.run("💪 Fitness", 4000, 0);

  // Vendor demand signals (employee searches → provider matching)
  const insSearch = db.prepare("INSERT INTO vendor_searches (company_id,employee_id,query,category,matched) VALUES (1,?,?,?,?)");
  insSearch.run(arta, "yoga studio near me", "🧘 Wellness", 1);
  insSearch.run(drita, "physiotherapy clinic", "🧘 Wellness", 0);
  insSearch.run(besnik, "language courses english", "📚 Education", 1);
  insSearch.run(arta, "childcare daycare", "👶 Childcare", 0);
  insSearch.run(drita, "dental checkup", "🏥 Health", 0);
  insSearch.run(besnik, "co-working space", "💼 Workspace", 0);
  insSearch.run(arta, "dental cleaning", "🏥 Health", 0);

  // ── Employer: benefit policies (category enabled + monthly cap) ──
  const insPolicy = db.prepare("INSERT INTO benefit_policies (company_id,category,enabled,max_per_month) VALUES (1,?,?,?)");
  insPolicy.run("💪 Fitness", 1, 5000);
  insPolicy.run("🍽️ Food", 1, 6000);
  insPolicy.run("🧘 Wellness", 1, 8000);
  insPolicy.run("✈️ Travel", 1, 12000);
  insPolicy.run("📱 Telecom", 1, 3500);
  insPolicy.run("📚 Education", 1, 15000);

  // ── Employer: provider partnerships (some active, some not = discovery list) ──
  const insPart = db.prepare("INSERT INTO partnerships (company_id,provider_id,status,discount_pct,since) VALUES (1,?,?,?,?)");
  insPart.run(provIds["Green Gym Tirana"], "active", 10, "2025-09-01");
  insPart.run(provIds["Mullixhiu Restaurant"], "active", 5, "2025-10-15");
  insPart.run(provIds["Zen Spa Tirana"], "active", 15, "2026-01-10");
  insPart.run(provIds["ALBtelecom"], "active", 8, "2025-11-20");
  // Juvenilja Travel + Shkolla Digjitale left unpartnered → show up in Provider Discovery.

  // ── Employer: multi-country offices ──
  const insOffice = db.prepare(`INSERT INTO offices
    (company_id,country,city,currency,fx_to_all,headcount,budget_per_employee,is_hq) VALUES (1,?,?,?,?,?,?,?)`);
  insOffice.run("Albania", "Tirana", "ALL", 1, 18, 12000, 1);
  insOffice.run("Kosovo", "Pristina", "EUR", 101, 9, 120, 0);
  insOffice.run("North Macedonia", "Skopje", "MKD", 1.78, 6, 7000, 0);

  // ── Employer: recruitment perk package (public) ──
  const insRecruit = db.prepare("INSERT INTO recruitment_perks (company_id,title,description,highlight) VALUES (1,?,?,?)");
  insRecruit.run("Flexible Benefits Wallet", "Up to 12,000 ALL/month to spend on fitness, food, wellness, travel & more.", 1);
  insRecruit.run("Wellness Days", "Monthly spa & wellness allowance plus team fitness challenges.", 1);
  insRecruit.run("Learning Budget", "Annual education pass — courses, certifications, conferences.", 0);
  insRecruit.run("Peer Recognition", "Gift reward credits to colleagues for great work.", 0);

  // ── Provider: employee reviews (real ratings; some awaiting reply) ──
  const zen = provIds["Zen Spa Tirana"];
  const insReview = db.prepare(`INSERT INTO reviews (provider_id,offer_id,employee_id,rating,comment,reply,created_at)
    VALUES (?,?,?,?,?,?,?)`);
  insReview.run(zen, offerIds["Relaxing Massage"].id, arta, 5, "Best massage in Tirana, felt amazing after.", null, "2026-02-12 10:00:00");
  insReview.run(zen, offerIds["Monthly Wellness"].id, drita, 4, "Great facilities, sometimes busy at peak hours.", "Thanks Drita! Try our morning slots — much quieter. 🧘", "2026-03-25 09:00:00");
  insReview.run(zen, offerIds["Relaxing Massage"].id, drita, 5, "Booked again, therapist was excellent.", null, "2026-05-10 14:00:00");
  insReview.run(zen, offerIds["Monthly Wellness"].id, ilir, 5, "Membership is worth every lek. Staff superb.", null, "2026-04-02 11:00:00");
  insReview.run(zen, offerIds["Relaxing Massage"].id, klara, 3, "Good but the room was a little cold.", null, "2026-05-22 17:00:00");

  // Reviews for other providers so the Provider console isn't Zen-only.
  insReview.run(provIds["Green Gym Tirana"], offerIds["Monthly Membership"].id, enkel, 5, "Best equipped gym in town.", "Cheers Enkel, see you at leg day! 💪", "2026-02-01 08:00:00");
  insReview.run(provIds["Green Gym Tirana"], offerIds["Monthly Membership"].id, ilir, 4, "Great classes, gets crowded after 6pm.", null, "2026-05-15 19:00:00");
  insReview.run(provIds["Mullixhiu Restaurant"], offerIds["Lunch Voucher x10"].id, flora, 5, "Incredible food, felt premium.", null, "2026-02-18 13:00:00");
  insReview.run(provIds["Juvenilja Travel"], offerIds["City Break"].id, jeta, 4, "Smooth booking, lovely trip.", null, "2026-04-12 10:00:00");

  // ── Employee: bookmarks ──
  const insBm = db.prepare("INSERT INTO bookmarks (employee_id,offer_id) VALUES (?,?)");
  insBm.run(arta, offerIds["Weekend Trip"].id);
  insBm.run(arta, offerIds["Course Credit"].id);
  insBm.run(arta, offerIds["Monthly Wellness"].id);
  insBm.run(arta, offerIds["Business Dinner x5"].id);

  // ── Employer: provider meetings (calendar) ──
  const insMeet = db.prepare(`INSERT INTO meetings (company_id,provider_id,title,date,time,location,notes)
    VALUES (1,?,?,?,?,?,?)`);
  insMeet.run(provIds["Zen Spa Tirana"], "Q3 wellness package renewal", "2026-06-24", "10:00", "Zen Spa, Blloku", "Discuss expanded massage slots + corporate rate.");
  insMeet.run(provIds["Green Gym Tirana"], "New gym membership tiers", "2026-06-26", "14:30", "TechTirana HQ", "Review 3-month pass demand from engineering.");
  insMeet.run(provIds["Mullixhiu Restaurant"], "Catering for company offsite", "2026-07-02", "09:00", "Video call", "Lunch options for 40 people.");

  // ── Employee: recurring subscriptions ──
  const insSub = db.prepare(`INSERT INTO subscriptions (employee_id,offer_id,price_all,next_run,last_run) VALUES (?,?,?,?,?)`);
  insSub.run(arta, offerIds["Monthly Membership"].id, offerIds["Monthly Membership"].price, "2026-07-01", "2026-06-01");
  insSub.run(drita, offerIds["Monthly Wellness"].id, offerIds["Monthly Wellness"].price, "2026-07-01", "2026-06-01");

  // ── Audit log: seed a few entries so the trail isn't empty ──
  const insAudit = db.prepare(`INSERT INTO audit_log (company_id,actor_id,actor_name,actor_role,action,detail,created_at)
    VALUES (1,?,?,?,?,?,?)`);
  insAudit.run(employerId, "Manager", "employer", "approve_selection", "selection #5 (4,000 ALL)", "2026-06-18 11:00:00");
  insAudit.run(employerId, "Manager", "employer", "update_budget", "Drita → 10,000 ALL", "2026-06-17 09:30:00");
  insAudit.run(employerId, "Manager", "employer", "update_policy", "✈️ Travel: cap 12,000", "2026-06-15 14:00:00");

  // ── Auth: give seeded users demo emails + a shared demo password ──
  const bcrypt = require("bcryptjs");
  const demoHash = bcrypt.hashSync("perx1234", 10);
  const setCred = db.prepare("UPDATE users SET email=?, password_hash=? WHERE id=?");
  // Employees + employer + hr → @techtirana.al
  const slug = (n) => n.toLowerCase().replace(/[^a-z]/g, "");
  for (const row of db.prepare("SELECT id,name,role FROM users WHERE role IN ('employee','employer','hr')").all()) {
    setCred.run(`${slug(row.name)}@techtirana.al`, demoHash, row.id);
  }
  // Provider login users → link to their provider_id, email @<provider>.al
  const linkProv = db.prepare("UPDATE users SET email=?, password_hash=?, provider_id=? WHERE id=?");
  for (const p of db.prepare("SELECT id, user_id, company_name FROM providers").all()) {
    linkProv.run(`owner@${slug(p.company_name)}.al`, demoHash, p.id, p.user_id);
  }

  console.log("Seeded. Demo password for all accounts: perx1234");
}

if (process.argv.includes("--seed")) seed();

module.exports = { db, seed };
