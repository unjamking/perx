const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "..", "perx.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY, name TEXT, budget_per_employee INTEGER
);
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY, company_id INTEGER, name TEXT, budget_override INTEGER
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT, role TEXT, company_id INTEGER,
  department_id INTEGER, budget_total INTEGER DEFAULT 0, budget_spent INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY, user_id INTEGER, company_name TEXT, category TEXT, description TEXT
);
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY, provider_id INTEGER, title TEXT, description TEXT,
  category TEXT, price_all INTEGER, is_active INTEGER DEFAULT 1, is_featured INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY, title TEXT, description TEXT, total_price_all INTEGER
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
`);

function seed() {
  const tables = ["challenge_progress","challenges","transactions","selection_items",
    "selections","package_offers","packages","offers","providers","users","departments","companies"];
  for (const t of tables) db.exec(`DELETE FROM ${t}`);

  db.prepare("INSERT INTO companies (id,name,budget_per_employee) VALUES (1,?,10000)")
    .run("TechTirana SH.P.K");

  const dept = db.prepare("INSERT INTO departments (company_id,name,budget_override) VALUES (1,?,?)");
  const eng = dept.run("Engineering", 12000).lastInsertRowid;
  const sales = dept.run("Sales", 10000).lastInsertRowid;
  const design = dept.run("Design", 10000).lastInsertRowid;

  const user = db.prepare(
    "INSERT INTO users (name,role,company_id,department_id,budget_total,budget_spent) VALUES (?,?,1,?,?,?)");
  // budget_total = dept budget, budget_spent seeded so "left" shows a real number
  user.run("Arta", "employee", eng, 12000, 5800);   // 6,200 left per spec
  user.run("Besnik", "employee", sales, 10000, 2000);
  user.run("Drita", "employee", design, 10000, 8500); // <20% -> red
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

  const insUser = db.prepare("INSERT INTO users (name,role,company_id) VALUES (?,?,1)");
  const insProv = db.prepare("INSERT INTO providers (user_id,company_name,category,description) VALUES (?,?,?,?)");
  const insOffer = db.prepare(
    "INSERT INTO offers (provider_id,title,description,category,price_all,is_featured) VALUES (?,?,?,?,?,?)");
  const offerIds = {};
  for (const [name, cat, desc, offers] of provData) {
    const uid = insUser.run(name, "provider").lastInsertRowid;
    const pid = insProv.run(uid, name, cat, desc).lastInsertRowid;
    offers.forEach(([title, d, price], i) => {
      const featured = (name === "Zen Spa Tirana" && i === 0) ? 1 : 0;
      offerIds[title] = { id: insOffer.run(pid, title, d, cat, price, featured).lastInsertRowid, price };
    });
  }

  // Package: Work & Wellness
  const pkgId = db.prepare(
    "INSERT INTO packages (title,description,total_price_all) VALUES (?,?,?)")
    .run("Work & Wellness", "Green Gym Monthly + Zen Spa Massage", 6300).lastInsertRowid;
  const linkPkg = db.prepare("INSERT INTO package_offers (package_id,offer_id) VALUES (?,?)");
  linkPkg.run(pkgId, offerIds["Monthly Membership"].id);
  linkPkg.run(pkgId, offerIds["Relaxing Massage"].id);

  db.prepare(`INSERT INTO challenges (company_id,title,description,category,bonus_all,deadline)
    VALUES (1,?,?,?,2000,?)`).run(
    "Wellness Month", "Complete 3 fitness sessions, earn 2,000 ALL bonus each", "💪 Fitness", "2026-07-19");

  console.log("Seeded.");
}

if (process.argv.includes("--seed")) seed();

module.exports = { db, seed };
