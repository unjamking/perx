require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { db, seed } = require("./database");
const { concierge } = require("./concierge");

// Seed on boot if empty so `npm run dev` just works.
if (db.prepare("SELECT COUNT(*) c FROM companies").get().c === 0) seed();

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" })); // base64 offer images can be large

const JWT_SECRET = process.env.JWT_SECRET || "perx-dev-secret-change-in-prod";

// Public user shape (never leak password_hash).
function publicUser(u) {
  return { id: u.id, name: u.name, role: u.role, email: u.email,
    company_id: u.company_id, provider_id: u.provider_id,
    budget_total: u.budget_total, budget_spent: u.budget_spent,
    must_change_password: !!u.must_change_password };
}

function sign(u) {
  return jwt.sign({ id: u.id, role: u.role }, JWT_SECRET, { expiresIn: "30d" });
}

// Append an audit entry. Safe to call inside a transaction.
function logAudit(actor, action, detail) {
  db.prepare(`INSERT INTO audit_log (company_id,actor_id,actor_name,actor_role,action,detail)
    VALUES (?,?,?,?,?,?)`).run(actor?.company_id || 1, actor?.id || null, actor?.name || "system", actor?.role || "system", action, detail || "");
}

// Send an Expo push notification to a user (fire-and-forget; no-op if no token).
// Expo's push service needs no API key for basic sends.
async function pushToUser(userId, title, body) {
  const rows = db.prepare("SELECT token FROM push_tokens WHERE user_id = ?").all(userId);
  if (!rows.length) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(rows.map((r) => ({ to: r.token, title, body, sound: "default" }))),
    });
  } catch (e) { console.error("push failed:", e.message); }
}

// In-memory login rate limiter: max 5 failed attempts / 15 min per email+IP.
// ponytail: in-memory Map, swap for Redis if multi-instance.
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5, WINDOW_MS = 15 * 60 * 1000;
function attemptKey(req, email) { return `${req.ip}:${String(email).toLowerCase()}`; }
function rateLimited(key) {
  const rec = loginAttempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) { loginAttempts.delete(key); return false; }
  return rec.count >= MAX_ATTEMPTS;
}
function noteFail(key) {
  const rec = loginAttempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) loginAttempts.set(key, { count: 1, first: Date.now() });
  else rec.count++;
}
function clearAttempts(key) { loginAttempts.delete(key); }

// ── Auth ──
// Auth middleware: verifies Bearer token, attaches req.authUser. Optional role gate.
function requireAuth(role) {
  return (req, res, next) => {
    const a = req.headers.authorization || "";
    const token = a.startsWith("Bearer ") ? a.slice(7) : null;
    if (!token) return res.status(401).json({ error: "not authenticated" });
    try {
      const { id } = jwt.verify(token, JWT_SECRET);
      const u = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      if (!u) return res.status(401).json({ error: "user not found" });
      if (role && u.role !== role) return res.status(403).json({ error: "forbidden" });
      req.authUser = u;
      next();
    } catch {
      res.status(401).json({ error: "invalid token" });
    }
  };
}

// Shared user-creation logic (used by HR user management). No public signup.
function createUser({ name, email, password, role }) {
  const normEmail = String(email).trim().toLowerCase();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(normEmail)) {
    const e = new Error("email already in use"); e.status = 409; throw e;
  }
  const hash = bcrypt.hashSync(password, 10);
  const tx = db.transaction(() => {
    const budget = role === "employee" ? 10000 : 0;
    // HR-provisioned accounts must change the temp password on first login.
    const uid = db.prepare(`INSERT INTO users (name,role,company_id,budget_total,budget_spent,email,password_hash,must_change_password)
      VALUES (?,?,1,?,0,?,?,1)`).run(name, role, budget, normEmail, hash).lastInsertRowid;
    if (role === "provider") {
      const pid = db.prepare("INSERT INTO providers (user_id,company_name,category,description) VALUES (?,?,?,?)")
        .run(uid, name, "🧘 Wellness", "").lastInsertRowid;
      db.prepare("UPDATE users SET provider_id = ? WHERE id = ?").run(pid, uid);
    }
    return db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
  });
  return tx();
}

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  const key = attemptKey(req, email);
  if (rateLimited(key)) return res.status(429).json({ error: "too many attempts, try again later" });
  const u = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).trim().toLowerCase());
  if (!u || !u.password_hash || !bcrypt.compareSync(password, u.password_hash)) {
    noteFail(key);
    return res.status(401).json({ error: "invalid email or password" });
  }
  clearAttempts(key);
  res.json({ token: sign(u), user: publicUser(u) });
});

// ─────────────── AUTH GATE ───────────────
// Everything below /api requires a valid token. Login is the only public route (above).
// Role-specific prefixes enforce role; ownership is derived from the token, not the client.
const ROLE_PREFIX = [
  { prefix: "/api/hr/", role: "hr" },
  { prefix: "/api/employer/", role: "employer" },
  { prefix: "/api/provider/", role: "provider" },
  { prefix: "/api/employee/", role: "employee" },
];
app.use("/api", (req, res, next) => {
  const a = req.headers.authorization || "";
  const token = a.startsWith("Bearer ") ? a.slice(7) : null;
  if (!token) return res.status(401).json({ error: "not authenticated" });
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); }
  catch { return res.status(401).json({ error: "invalid token" }); }
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.id);
  if (!u) return res.status(401).json({ error: "user not found" });
  // Role gate by path prefix.
  const path = req.baseUrl + req.path; // full /api/... path
  const match = ROLE_PREFIX.find((r) => path.startsWith(r.prefix));
  if (match && u.role !== match.role) return res.status(403).json({ error: "forbidden" });
  req.authUser = u;
  // Scope: employees may only ever act on their own id; providers on their own provider_id.
  // Override any client-supplied value so query/body params can't target another account.
  if (u.role === "employee") { req.query.employee_id = String(u.id); }
  if (u.role === "provider" && u.provider_id) { req.query.provider_id = String(u.provider_id); }
  next();
});

// Current user from token.
app.get("/api/auth/me", (req, res) => res.json({ user: publicUser(req.authUser) }));

// Register an Expo push token for the logged-in user.
app.post("/api/push/register", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });
  db.prepare("INSERT OR IGNORE INTO push_tokens (user_id,token) VALUES (?,?)").run(req.authUser.id, token);
  res.json({ ok: true });
});

// Change own password (clears the must-change flag).
app.post("/api/auth/change-password", (req, res) => {
  const { current, next: newPw } = req.body;
  const u = req.authUser;
  if (!newPw || newPw.length < 6) return res.status(400).json({ error: "new password must be at least 6 characters" });
  // Verify current unless the account is in forced-reset state.
  if (!u.must_change_password) {
    if (!current || !bcrypt.compareSync(current, u.password_hash))
      return res.status(401).json({ error: "current password is incorrect" });
  }
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?")
    .run(bcrypt.hashSync(newPw, 10), u.id);
  res.json({ ok: true });
});

// ── HR user management: provision accounts + hand out credentials ──
// Generates a temporary password if none given, returns it once so HR can share it.
function tempPassword() {
  return "Perx-" + Math.random().toString(36).slice(2, 8);
}

app.get("/api/hr/users", requireAuth("hr"), (req, res) => {
  const company_id = req.authUser.company_id || 1;
  const rows = db.prepare(`SELECT id, name, email, role, department_id, provider_id, budget_total
    FROM users WHERE company_id = ? AND email IS NOT NULL ORDER BY role, name`).all(company_id);
  res.json(rows);
});

app.post("/api/hr/users", requireAuth("hr"), (req, res) => {
  const { name, email, role = "employee", password } = req.body;
  if (!name || !email) return res.status(400).json({ error: "name and email required" });
  if (!["employee", "employer", "hr", "provider"].includes(role))
    return res.status(400).json({ error: "invalid role" });
  const pw = password && password.length >= 6 ? password : tempPassword();
  try {
    const u = createUser({ name, email, password: pw, role });
    // Return the plaintext temp password exactly once so HR can deliver it.
    res.json({ user: publicUser(u), tempPassword: pw });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Reset a user's password → new temp credential.
app.put("/api/hr/users/:id/reset", requireAuth("hr"), (req, res) => {
  const u = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!u) return res.status(404).json({ error: "user not found" });
  const pw = tempPassword();
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?").run(bcrypt.hashSync(pw, 10), req.params.id);
  res.json({ tempPassword: pw });
});

const offerWithProvider = `
  SELECT o.*, p.company_name AS provider, p.id AS provider_id
  FROM offers o JOIN providers p ON p.id = o.provider_id`;

app.get("/api/offers", (req, res) => {
  res.json(db.prepare(`${offerWithProvider} WHERE o.is_active = 1`).all());
});

app.get("/api/packages", (req, res) => {
  const pkgs = db.prepare("SELECT * FROM packages").all();
  const link = db.prepare(`SELECT o.*, p.company_name AS provider
    FROM package_offers po JOIN offers o ON o.id = po.offer_id
    JOIN providers p ON p.id = o.provider_id WHERE po.package_id = ?`);
  res.json(pkgs.map((pk) => ({ ...pk, offers: link.all(pk.id) })));
});

app.get("/api/catalog", (req, res) => {
  res.json(db.prepare(`${offerWithProvider} WHERE o.is_active = 1`).all());
});

// Create selection (cart -> request approval)
app.post("/api/selections", (req, res) => {
  // Employees act as themselves; the id comes from the token, not the client.
  const employee_id = req.authUser.role === "employee" ? req.authUser.id : req.body.employee_id;
  const { items, gift_to } = req.body; // items: [{offer_id, price_all}]
  if (!employee_id || !items?.length) return res.status(400).json({ error: "employee_id and items required" });
  const total = items.reduce((s, i) => s + i.price_all, 0);
  const emp = db.prepare("SELECT budget_total, budget_spent FROM users WHERE id = ?").get(employee_id);
  if (!emp) return res.status(404).json({ error: "employee not found" });
  // Server-side budget guard: never approve more than the employee has left.
  if (total > emp.budget_total - emp.budget_spent)
    return res.status(400).json({ error: "exceeds remaining budget" });
  // Capacity guard: offers with a capacity can't be redeemed beyond their limit.
  const capRow = db.prepare("SELECT capacity FROM offers WHERE id = ?");
  const bookedFor = db.prepare(`SELECT COUNT(*) c FROM selection_items si
    JOIN selections s ON s.id = si.selection_id
    WHERE si.offer_id = ? AND s.status = 'approved'`);
  for (const i of items) {
    const cap = capRow.get(i.offer_id)?.capacity || 0;
    if (cap > 0 && bookedFor.get(i.offer_id).c >= cap)
      return res.status(409).json({ error: "offer is fully booked" });
  }
  // Auto-approval guardrails: if every item falls under an enabled rule (category + cap),
  // the selection skips manual review and is paid out instantly.
  const offerCat = db.prepare("SELECT category FROM offers WHERE id = ?");
  const rules = db.prepare("SELECT category, max_amount FROM auto_rules WHERE enabled = 1").all();
  const autoOk = items.every((i) => {
    const cat = offerCat.get(i.offer_id)?.category;
    const rule = rules.find((r) => r.category === cat);
    return rule && i.price_all <= rule.max_amount;
  });

  const tx = db.transaction(() => {
    const status = autoOk ? "approved" : "pending";
    const selId = db.prepare(
      "INSERT INTO selections (employee_id,total_amount,gift_to,status) VALUES (?,?,?,?)")
      .run(employee_id, total, gift_to || null, status).lastInsertRowid;
    const insItem = db.prepare(
      "INSERT INTO selection_items (selection_id,offer_id,price_all) VALUES (?,?,?)");
    for (const i of items) insItem.run(selId, i.offer_id, i.price_all);
    if (autoOk) {
      // Instant simulated payout (same flow as manual approve).
      db.prepare("UPDATE users SET budget_spent = budget_spent + ? WHERE id = ?").run(total, employee_id);
      const insT = db.prepare(
        "INSERT INTO transactions (selection_id,provider_id,amount_all,status) VALUES (?,?,?,'paid')");
      for (const it of itemsFor.all(selId)) insT.run(selId, it.provider_id, it.price_all);
    }
    return selId;
  });
  res.json({ id: tx(), total, auto_approved: autoOk });
});

const itemsFor = db.prepare(`
  SELECT si.*, o.title, o.category, p.company_name AS provider, p.id AS provider_id
  FROM selection_items si JOIN offers o ON o.id = si.offer_id
  JOIN providers p ON p.id = o.provider_id WHERE si.selection_id = ?`);

function hydrate(sel) {
  const emp = db.prepare("SELECT name FROM users WHERE id = ?").get(sel.employee_id);
  const giftedBy = sel.gifted_by ? db.prepare("SELECT name FROM users WHERE id = ?").get(sel.gifted_by)?.name : null;
  return { ...sel, employee_name: emp?.name, gifted_by_name: giftedBy, items: itemsFor.all(sel.id) };
}

app.get("/api/selections", (req, res) => {
  const { employee_id } = req.query;
  const rows = db.prepare("SELECT * FROM selections WHERE employee_id = ? ORDER BY created_at DESC")
    .all(employee_id);
  res.json(rows.map(hydrate));
});

app.get("/api/selections/pending", (req, res) => {
  const { company_id = 1 } = req.query;
  const rows = db.prepare(`SELECT s.* FROM selections s
    JOIN users u ON u.id = s.employee_id
    WHERE u.company_id = ? AND s.status = 'pending' ORDER BY s.created_at DESC`).all(company_id);
  res.json(rows.map(hydrate));
});

app.put("/api/selections/:id/approve", (req, res) => {
  const id = req.params.id;
  const sel = db.prepare("SELECT * FROM selections WHERE id = ?").get(id);
  if (!sel) return res.status(404).json({ error: "not found" });
  // Capacity guard at approval time too.
  const capRow = db.prepare("SELECT capacity FROM offers WHERE id = ?");
  const bookedFor = db.prepare(`SELECT COUNT(*) c FROM selection_items si
    JOIN selections s ON s.id = si.selection_id WHERE si.offer_id = ? AND s.status = 'approved'`);
  for (const it of itemsFor.all(id)) {
    const cap = capRow.get(it.offer_id)?.capacity || 0;
    if (cap > 0 && bookedFor.get(it.offer_id).c >= cap)
      return res.status(409).json({ error: `"${it.title}" is fully booked` });
  }
  const tx = db.transaction(() => {
    db.prepare("UPDATE selections SET status = 'approved' WHERE id = ?").run(id);
    db.prepare("UPDATE users SET budget_spent = budget_spent + ? WHERE id = ?")
      .run(sel.total_amount, sel.employee_id);
    const insTx = db.prepare(
      "INSERT INTO transactions (selection_id,provider_id,amount_all,status) VALUES (?,?,?,'paid')");
    for (const it of itemsFor.all(id)) insTx.run(id, it.provider_id, it.price_all);
    logAudit(req.authUser, "approve_selection", `selection #${id} (${sel.total_amount} ALL)`);
  });
  tx();
  pushToUser(sel.employee_id, "Benefit approved ✅", `Your request for ${sel.total_amount} ALL was approved.`);
  res.json({ ok: true });
});

app.put("/api/selections/:id/reject", (req, res) => {
  const sel = db.prepare("SELECT employee_id FROM selections WHERE id = ?").get(req.params.id);
  db.prepare("UPDATE selections SET status = 'rejected' WHERE id = ?").run(req.params.id);
  logAudit(req.authUser, "reject_selection", `selection #${req.params.id}`);
  if (sel) pushToUser(sel.employee_id, "Benefit request update", "Your request was not approved this time.");
  res.json({ ok: true });
});

app.get("/api/employees", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare(`SELECT u.*, d.name AS department
    FROM users u LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = ? AND u.role = 'employee'`).all(company_id));
});

app.put("/api/employees/:id/budget", (req, res) => {
  const id = req.params.id;
  const { budget_total } = req.body;
  if (budget_total === undefined || isNaN(Number(budget_total))) {
    return res.status(400).json({ error: "budget_total is required and must be a number" });
  }
  const target = db.prepare("SELECT name FROM users WHERE id = ?").get(id);
  const result = db.prepare("UPDATE users SET budget_total = ? WHERE id = ?").run(Number(budget_total), id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "employee not found" });
  }
  logAudit(req.authUser, "update_budget", `${target?.name || "#" + id} → ${Number(budget_total)} ALL`);
  res.json({ ok: true, budget_total: Number(budget_total) });
});

app.get("/api/payments", (req, res) => {
  const { provider_id } = req.query;
  const where = provider_id ? "WHERE t.provider_id = ?" : "";
  const args = provider_id ? [provider_id] : [];
  res.json(db.prepare(`SELECT t.*, u.name AS employee, p.company_name AS provider
    FROM transactions t
    JOIN selections s ON s.id = t.selection_id
    JOIN users u ON u.id = s.employee_id
    JOIN providers p ON p.id = t.provider_id ${where}
    ORDER BY t.created_at DESC`).all(...args));
});

app.get("/api/analytics", (req, res) => {
  const { company_id = 1 } = req.query;
  const byCat = db.prepare(`SELECT o.category, SUM(si.price_all) AS total
    FROM selection_items si JOIN offers o ON o.id = si.offer_id
    JOIN selections s ON s.id = si.selection_id
    JOIN users u ON u.id = s.employee_id
    WHERE u.company_id = ? AND s.status = 'approved'
    GROUP BY o.category`).all(company_id);
  const topOffers = db.prepare(`SELECT o.title, o.category, COUNT(*) AS count, SUM(si.price_all) total
    FROM selection_items si JOIN offers o ON o.id = si.offer_id
    JOIN selections s ON s.id = si.selection_id
    WHERE s.status = 'approved' GROUP BY si.offer_id ORDER BY count DESC LIMIT 3`).all();
  const trend = monthlySpend(company_id);
  const totalBudget = db.prepare(`SELECT SUM(budget_total) t FROM users
    WHERE company_id = ? AND role='employee'`).get(company_id).t || 0;
  const totalSpent = db.prepare(`SELECT SUM(budget_spent) t FROM users
    WHERE company_id = ? AND role='employee'`).get(company_id).t || 0;
  res.json({ byCat, topOffers, trend, unusedBudget: totalBudget - totalSpent });
});

function liveSpend(company_id) {
  return db.prepare(`SELECT COALESCE(SUM(amount_all),0) t FROM transactions t
    JOIN selections s ON s.id = t.selection_id
    JOIN users u ON u.id = s.employee_id WHERE u.company_id = ?`).get(company_id).t;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Real spend grouped by calendar month from actual transactions.
function monthlySpend(company_id) {
  const rows = db.prepare(`SELECT strftime('%Y-%m', t.created_at) ym, SUM(t.amount_all) spend
    FROM transactions t JOIN selections s ON s.id = t.selection_id
    JOIN users u ON u.id = s.employee_id
    WHERE u.company_id = ? GROUP BY ym ORDER BY ym`).all(company_id);
  return rows.map((r) => ({ month: MONTHS[Number(r.ym.split("-")[1]) - 1], ym: r.ym, spend: r.spend }));
}

// Least-squares linear forecast on monthly spend → predicts next month.
function forecastNext(series) {
  const n = series.length;
  if (n < 2) return series[0]?.spend || 0;
  const xs = series.map((_, i) => i);
  const ys = series.map((p) => p.spend);
  const sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
  const sxx = xs.reduce((a, b) => a + b * b, 0), sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return Math.max(0, Math.round(slope * n + intercept));
}

app.get("/api/hr/table", (req, res) => {
  const { company_id = 1 } = req.query;
  const emps = db.prepare(`SELECT u.*, d.name AS department
    FROM users u LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.company_id = ? AND u.role = 'employee'`).all(company_id);
  res.json(emps.map((e) => {
    const top = db.prepare(`SELECT o.category, SUM(si.price_all) t
      FROM selection_items si JOIN offers o ON o.id = si.offer_id
      JOIN selections s ON s.id = si.selection_id
      WHERE s.employee_id = ? AND s.status='approved'
      GROUP BY o.category ORDER BY t DESC LIMIT 1`).get(e.id);
    const last = db.prepare(`SELECT created_at FROM selections
      WHERE employee_id = ? ORDER BY created_at DESC LIMIT 1`).get(e.id);
    return {
      id: e.id, name: e.name, department: e.department,
      budget: e.budget_total, spent: e.budget_spent,
      remaining: e.budget_total - e.budget_spent,
      top_category: top?.category || "—",
      last_activity: last?.created_at || null,
      status: e.budget_total - e.budget_spent <= 0 ? "Maxed" : "Active",
    };
  }));
});

app.get("/api/hr/compliance", (req, res) => {
  const { company_id = 1 } = req.query;
  const audit = db.prepare(`SELECT t.*, u.name AS employee, p.company_name AS provider
    FROM transactions t JOIN selections s ON s.id = t.selection_id
    JOIN users u ON u.id = s.employee_id
    JOIN providers p ON p.id = t.provider_id
    WHERE u.company_id = ? ORDER BY t.created_at DESC`).all(company_id);
  const spent = liveSpend(company_id);
  // Albania: benefits taxed as salary ~ social + income contributions. Demo figure ~30%.
  res.json({ audit, taxSaved: Math.round(spent * 0.3) });
});

app.get("/api/hr/nudge", (req, res) => {
  const { company_id = 1 } = req.query;
  const emps = db.prepare(`SELECT u.* FROM users u
    WHERE u.company_id = ? AND u.role = 'employee'`).all(company_id);
  const now = Date.now();
  const inactive = emps.map((e) => {
    const last = db.prepare(`SELECT created_at FROM selections
      WHERE employee_id = ? ORDER BY created_at DESC LIMIT 1`).get(e.id);
    const days = last ? Math.floor((now - new Date(last.created_at + "Z").getTime()) / 86400000) : 99;
    return { id: e.id, name: e.name, days_inactive: days };
  }).filter((e) => e.days_inactive >= 14);
  const total = emps.length;
  const active = total - inactive.length;
  res.json({ inactive, utilization: total ? Math.round((active / total) * 100) : 0 });
});

app.get("/api/hr/challenges", (req, res) => {
  const { company_id = 1 } = req.query;
  const rows = db.prepare("SELECT * FROM challenges WHERE company_id = ? AND is_active = 1").all(company_id);
  res.json(rows.map((c) => ({
    ...c,
    progress: db.prepare(`SELECT u.name, cp.completed FROM challenge_progress cp
      JOIN users u ON u.id = cp.employee_id WHERE cp.challenge_id = ?`).all(c.id),
  })));
});

app.post("/api/hr/challenges", (req, res) => {
  const { company_id = 1, title, description, category, bonus_all, deadline } = req.body;
  if (!title || !bonus_all) return res.status(400).json({ error: "title and bonus_all required" });
  const id = db.prepare(`INSERT INTO challenges (company_id,title,description,category,bonus_all,deadline)
    VALUES (?,?,?,?,?,?)`).run(company_id, title, description || "", category || "", bonus_all, deadline || "")
    .lastInsertRowid;
  res.json({ id });
});

app.post("/api/concierge", async (req, res) => {
  const { message, employee_id, lang } = req.body;
  const emp = db.prepare("SELECT budget_total, budget_spent FROM users WHERE id = ?").get(employee_id) || {};
  const budget_remaining = (emp.budget_total || 10000) - (emp.budget_spent || 0);
  const catalog = db.prepare(`${offerWithProvider} WHERE o.is_active = 1`).all()
    .map((o) => ({ id: o.id, title: o.title, provider: o.provider, category: o.category, price_all: o.price_all }));
  try {
    res.json(await concierge({ message, budget_remaining, catalog, lang }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Provider: add offer (+ optional toggle)
app.post("/api/offers", (req, res) => {
  const { provider_id, title, description, category, price_all } = req.body;
  if (!provider_id || !title || !price_all) return res.status(400).json({ error: "missing fields" });
  const id = db.prepare(`INSERT INTO offers (provider_id,title,description,category,price_all)
    VALUES (?,?,?,?,?)`).run(provider_id, title, description || "", category || "", price_all).lastInsertRowid;
  res.json({ id });
});

app.put("/api/offers/:id/toggle", (req, res) => {
  db.prepare("UPDATE offers SET is_active = NOT is_active WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/providers", (req, res) => {
  res.json(db.prepare("SELECT * FROM providers").all());
});

// ── Budget forecasting: real monthly trend + linear prediction + waste projection ──
app.get("/api/hr/forecast", (req, res) => {
  const { company_id = 1 } = req.query;
  const series = monthlySpend(company_id);
  const predicted = forecastNext(series);
  const totalBudget = db.prepare(`SELECT COALESCE(SUM(budget_total),0) t FROM users
    WHERE company_id = ? AND role='employee'`).get(company_id).t;
  const totalSpent = db.prepare(`SELECT COALESCE(SUM(budget_spent),0) t FROM users
    WHERE company_id = ? AND role='employee'`).get(company_id).t;
  const avg = series.length ? Math.round(series.reduce((a, p) => a + p.spend, 0) / series.length) : 0;
  // Projected waste: budget that historically goes unused, extrapolated forward.
  const projectedWaste = Math.max(0, totalBudget - predicted);
  const lastTwo = series.slice(-2);
  const momChange = lastTwo.length === 2 && lastTwo[0].spend
    ? Math.round(((lastTwo[1].spend - lastTwo[0].spend) / lastTwo[0].spend) * 100) : 0;
  res.json({ series, predicted, avg, momChange, totalBudget, totalSpent, projectedWaste });
});

// ── Sentiment: Workforce Happiness Score derived from real engagement signals ──
app.get("/api/hr/sentiment", (req, res) => {
  const { company_id = 1 } = req.query;
  const emps = db.prepare(`SELECT id, budget_total, budget_spent FROM users
    WHERE company_id = ? AND role='employee'`).all(company_id);
  if (!emps.length) return res.json({ score: 0, drivers: [], breakdown: [] });

  const now = Date.now();
  let utilSum = 0, varietySum = 0, activeCount = 0, participateCount = 0;
  const breakdown = [];
  for (const e of emps) {
    const util = e.budget_total ? Math.min(1, e.budget_spent / e.budget_total) : 0;
    const cats = db.prepare(`SELECT COUNT(DISTINCT o.category) c
      FROM selection_items si JOIN offers o ON o.id = si.offer_id
      JOIN selections s ON s.id = si.selection_id
      WHERE s.employee_id = ? AND s.status='approved'`).get(e.id).c;
    const variety = Math.min(1, cats / 4); // 4+ categories = full variety
    const last = db.prepare(`SELECT created_at FROM selections
      WHERE employee_id = ? ORDER BY created_at DESC LIMIT 1`).get(e.id);
    const days = last ? Math.floor((now - new Date(last.created_at + "Z").getTime()) / 86400000) : 99;
    const active = days < 14 ? 1 : 0;
    const part = db.prepare("SELECT COUNT(*) c FROM challenge_progress WHERE employee_id = ?").get(e.id).c > 0 ? 1 : 0;
    utilSum += util; varietySum += variety; activeCount += active; participateCount += part;
    breakdown.push({ id: e.id, util: Math.round(util * 100), variety: cats, active: !!active, participating: !!part });
  }
  const n = emps.length;
  const utilScore = (utilSum / n) * 100;
  const varietyScore = (varietySum / n) * 100;
  const activeScore = (activeCount / n) * 100;
  const partScore = (participateCount / n) * 100;
  // Weighted composite → 0-100 Workforce Happiness Score
  const score = Math.round(utilScore * 0.35 + activeScore * 0.30 + varietyScore * 0.20 + partScore * 0.15);
  const drivers = [
    { label: "Budget Utilization", value: Math.round(utilScore), weight: 35 },
    { label: "Recent Activity", value: Math.round(activeScore), weight: 30 },
    { label: "Perk Variety", value: Math.round(varietyScore), weight: 20 },
    { label: "Challenge Participation", value: Math.round(partScore), weight: 15 },
  ];
  res.json({ score, drivers, breakdown });
});

// ── Provider matching: surface vendor demand from real employee searches ──
app.get("/api/hr/provider-matches", (req, res) => {
  const { company_id = 1 } = req.query;
  const covered = new Set(db.prepare("SELECT DISTINCT category FROM providers").all().map((r) => r.category));
  const demand = db.prepare(`SELECT category, COUNT(*) searches, SUM(matched) matched
    FROM vendor_searches WHERE company_id = ? GROUP BY category ORDER BY searches DESC`).all(company_id);
  const gaps = demand.map((d) => ({
    category: d.category,
    searches: d.searches,
    unmatched: d.searches - (d.matched || 0),
    covered: covered.has(d.category),
    queries: db.prepare(`SELECT DISTINCT query FROM vendor_searches
      WHERE company_id = ? AND category = ? LIMIT 4`).all(company_id, d.category).map((q) => q.query),
  })).filter((g) => !g.covered || g.unmatched > 0);
  res.json({ gaps });
});

// ── Auto-approval rules (AI guardrails) ──
app.get("/api/hr/auto-rules", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare("SELECT * FROM auto_rules WHERE company_id = ? ORDER BY category").all(company_id));
});

app.post("/api/hr/auto-rules", (req, res) => {
  const { company_id = 1, category, max_amount } = req.body;
  if (!category || !max_amount) return res.status(400).json({ error: "category and max_amount required" });
  const id = db.prepare("INSERT INTO auto_rules (company_id,category,max_amount) VALUES (?,?,?)")
    .run(company_id, category, max_amount).lastInsertRowid;
  res.json({ id });
});

app.put("/api/hr/auto-rules/:id/toggle", (req, res) => {
  db.prepare("UPDATE auto_rules SET enabled = NOT enabled WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Flash drops (limited-time perks) ──
app.get("/api/hr/flash-drops", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare(`SELECT f.*, o.title AS offer_title, p.company_name AS provider
    FROM flash_drops f LEFT JOIN offers o ON o.id = f.offer_id
    LEFT JOIN providers p ON p.id = o.provider_id
    WHERE f.company_id = ? ORDER BY f.ends_at DESC`).all(company_id));
});

app.post("/api/hr/flash-drops", (req, res) => {
  const { company_id = 1, title, description, offer_id, bonus_all, starts_at, ends_at } = req.body;
  if (!title || !bonus_all) return res.status(400).json({ error: "title and bonus_all required" });
  const id = db.prepare(`INSERT INTO flash_drops (company_id,title,description,offer_id,bonus_all,starts_at,ends_at)
    VALUES (?,?,?,?,?,?,?)`).run(company_id, title, description || "", offer_id || null, bonus_all,
    starts_at || "", ends_at || "").lastInsertRowid;
  res.json({ id });
});

// ── Peer gifting feed ──
app.get("/api/hr/gifts", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare(`SELECT g.*, uf.name AS from_name, ut.name AS to_name
    FROM gifts g JOIN users uf ON uf.id = g.from_employee
    JOIN users ut ON ut.id = g.to_employee
    WHERE uf.company_id = ? ORDER BY g.created_at DESC`).all(company_id));
});

app.post("/api/gifts", (req, res) => {
  // Sender is always the authenticated user (can't gift on someone else's behalf).
  const from_employee = req.authUser.role === "employee" ? req.authUser.id : req.body.from_employee;
  const { to_employee, note } = req.body;
  const kind = req.body.kind || "credit"; // credit | offer | bundle
  if (!from_employee || !to_employee) return res.status(400).json({ error: "from_employee, to_employee required" });
  if (from_employee === to_employee) return res.status(400).json({ error: "cannot gift yourself" });
  const sender = db.prepare("SELECT budget_total, budget_spent FROM users WHERE id = ?").get(from_employee);
  if (!sender) return res.status(404).json({ error: "sender not found" });
  const available = sender.budget_total - sender.budget_spent;

  // Resolve what's being gifted + its cost; build the recipient's items if it's a product/bundle.
  let amount, items = [], offer_id = null, package_id = null;
  if (kind === "credit") {
    amount = Number(req.body.amount_all);
    if (!amount) return res.status(400).json({ error: "amount_all required for credit gift" });
  } else if (kind === "offer") {
    offer_id = req.body.offer_id;
    const o = db.prepare("SELECT id, price_all FROM offers WHERE id = ? AND is_active = 1").get(offer_id);
    if (!o) return res.status(404).json({ error: "offer not found" });
    amount = o.price_all; items = [{ offer_id: o.id, price_all: o.price_all }];
  } else if (kind === "bundle") {
    package_id = req.body.package_id;
    const pkg = db.prepare("SELECT id, total_price_all FROM packages WHERE id = ?").get(package_id);
    if (!pkg) return res.status(404).json({ error: "bundle not found" });
    const offs = db.prepare(`SELECT o.id, o.price_all FROM package_offers po
      JOIN offers o ON o.id = po.offer_id WHERE po.package_id = ?`).all(package_id);
    amount = pkg.total_price_all || offs.reduce((s, o) => s + o.price_all, 0);
    items = offs.map((o) => ({ offer_id: o.id, price_all: o.price_all }));
  } else {
    return res.status(400).json({ error: "invalid gift kind" });
  }
  if (amount > available) return res.status(400).json({ error: "exceeds remaining budget" });

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO gifts (from_employee,to_employee,amount_all,note,kind,offer_id,package_id) VALUES (?,?,?,?,?,?,?)")
      .run(from_employee, to_employee, amount, note || "", kind, offer_id, package_id);
    // Sender always pays from their budget.
    db.prepare("UPDATE users SET budget_spent = budget_spent + ? WHERE id = ?").run(amount, from_employee);
    if (kind === "credit") {
      // Recipient gets spendable credit.
      db.prepare("UPDATE users SET budget_total = budget_total + ? WHERE id = ?").run(amount, to_employee);
    } else {
      // Recipient gets the actual benefit: an approved, already-paid selection in their wallet.
      const selId = db.prepare("INSERT INTO selections (employee_id,total_amount,status,gifted_by) VALUES (?,?, 'approved', ?)")
        .run(to_employee, amount, from_employee).lastInsertRowid;
      const insItem = db.prepare("INSERT INTO selection_items (selection_id,offer_id,price_all) VALUES (?,?,?)");
      const insT = db.prepare("INSERT INTO transactions (selection_id,provider_id,amount_all,status) VALUES (?,?,?,'paid')");
      for (const it of items) {
        insItem.run(selId, it.offer_id, it.price_all);
        const prov = db.prepare("SELECT provider_id FROM offers WHERE id = ?").get(it.offer_id);
        insT.run(selId, prov?.provider_id, it.price_all);
      }
    }
  });
  tx();
  res.json({ ok: true });
});

// ── Bulk / department budget allocation ──
app.post("/api/hr/allocate", (req, res) => {
  const { company_id = 1, department_id, amount, mode = "set" } = req.body; // mode: set | add
  if (amount === undefined || isNaN(Number(amount))) return res.status(400).json({ error: "amount required" });
  const amt = Number(amount);
  const where = department_id ? "AND department_id = ?" : "";
  const args = department_id ? [company_id, department_id] : [company_id];
  const sql = mode === "add"
    ? `UPDATE users SET budget_total = budget_total + ? WHERE company_id = ? AND role='employee' ${where}`
    : `UPDATE users SET budget_total = ? WHERE company_id = ? AND role='employee' ${where}`;
  const result = db.prepare(sql).run(amt, ...args);
  logAudit(req.authUser, "allocate_budget", `${mode} ${amt} ALL → ${department_id ? "dept #" + department_id : "all employees"} (${result.changes})`);
  res.json({ ok: true, affected: result.changes });
});

// Audit trail (HR + employer view their company's log).
app.get("/api/hr/audit", (req, res) => {
  const company_id = req.authUser.company_id || 1;
  res.json(db.prepare("SELECT * FROM audit_log WHERE company_id = ? ORDER BY created_at DESC LIMIT 100").all(company_id));
});
app.get("/api/employer/audit", (req, res) => {
  const company_id = req.authUser.company_id || 1;
  res.json(db.prepare("SELECT * FROM audit_log WHERE company_id = ? ORDER BY created_at DESC LIMIT 100").all(company_id));
});

app.get("/api/departments", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare("SELECT * FROM departments WHERE company_id = ?").all(company_id));
});

// ── Simulated payout / instant credit routing log (real transactions feed) ──
app.get("/api/hr/payouts", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare(`SELECT t.*, u.name AS employee, p.company_name AS provider, o.title AS perk
    FROM transactions t JOIN selections s ON s.id = t.selection_id
    JOIN users u ON u.id = s.employee_id
    JOIN providers p ON p.id = t.provider_id
    LEFT JOIN selection_items si ON si.selection_id = s.id
    LEFT JOIN offers o ON o.id = si.offer_id
    WHERE u.company_id = ? ORDER BY t.created_at DESC LIMIT 50`).all(company_id));
});

// ════════════ EMPLOYER ════════════

// ── Company branding / employer profile ──
app.get("/api/employer/company", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare("SELECT * FROM companies WHERE id = ?").get(company_id));
});

app.put("/api/employer/company", (req, res) => {
  const { company_id = 1, tagline, logo_emoji, brand_color, mission, perks_headline } = req.body;
  db.prepare(`UPDATE companies SET tagline=?, logo_emoji=?, brand_color=?, mission=?, perks_headline=? WHERE id=?`)
    .run(tagline, logo_emoji, brand_color, mission, perks_headline, company_id);
  res.json({ ok: true });
});

// ── Benefit policies (category enable + monthly cap) ──
app.get("/api/employer/policies", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare("SELECT * FROM benefit_policies WHERE company_id = ? ORDER BY id").all(company_id));
});

app.put("/api/employer/policies/:id", (req, res) => {
  const { enabled, max_per_month } = req.body;
  const cur = db.prepare("SELECT * FROM benefit_policies WHERE id = ?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "not found" });
  db.prepare("UPDATE benefit_policies SET enabled = ?, max_per_month = ? WHERE id = ?")
    .run(enabled ?? cur.enabled, max_per_month ?? cur.max_per_month, req.params.id);
  logAudit(req.authUser, "update_policy", `${cur.category}: ${(enabled ?? cur.enabled) ? "enabled" : "disabled"}, cap ${max_per_month ?? cur.max_per_month}`);
  res.json({ ok: true });
});

// ── Provider partnerships + discovery ──
app.get("/api/employer/partnerships", (req, res) => {
  const { company_id = 1 } = req.query;
  // All providers, annotated with partnership status + real spend with them.
  const providers = db.prepare("SELECT * FROM providers").all();
  const parts = db.prepare("SELECT * FROM partnerships WHERE company_id = ?").all(company_id);
  const byProv = Object.fromEntries(parts.map((p) => [p.provider_id, p]));
  res.json(providers.map((pr) => {
    const spend = db.prepare(`SELECT COALESCE(SUM(t.amount_all),0) t, COUNT(*) c
      FROM transactions t JOIN selections s ON s.id = t.selection_id
      JOIN users u ON u.id = s.employee_id
      WHERE t.provider_id = ? AND u.company_id = ?`).get(pr.id, company_id);
    const part = byProv[pr.id];
    return {
      ...pr, partnered: !!part, status: part?.status || null,
      discount_pct: part?.discount_pct || 0, since: part?.since || null,
      spend: spend.t, txns: spend.c,
    };
  }));
});

app.post("/api/employer/partnerships", (req, res) => {
  const { company_id = 1, provider_id, discount_pct = 0 } = req.body;
  if (!provider_id) return res.status(400).json({ error: "provider_id required" });
  const exists = db.prepare("SELECT id FROM partnerships WHERE company_id = ? AND provider_id = ?").get(company_id, provider_id);
  if (exists) {
    db.prepare("UPDATE partnerships SET status='active', discount_pct=? WHERE id=?").run(discount_pct, exists.id);
  } else {
    db.prepare("INSERT INTO partnerships (company_id,provider_id,status,discount_pct) VALUES (?,?,'active',?)")
      .run(company_id, provider_id, discount_pct);
  }
  res.json({ ok: true });
});

app.delete("/api/employer/partnerships/:provider_id", (req, res) => {
  const { company_id = 1 } = req.query;
  db.prepare("DELETE FROM partnerships WHERE company_id = ? AND provider_id = ?").run(company_id, req.params.provider_id);
  res.json({ ok: true });
});

// ── Marketplace curation: all offers with active/featured flags + popularity ──
app.get("/api/employer/marketplace", (req, res) => {
  const rows = db.prepare(`SELECT o.*, p.company_name AS provider,
    (SELECT COUNT(*) FROM selection_items si WHERE si.offer_id = o.id) AS picks
    FROM offers o JOIN providers p ON p.id = o.provider_id ORDER BY picks DESC`).all();
  res.json(rows);
});

app.put("/api/employer/offers/:id/feature", (req, res) => {
  db.prepare("UPDATE offers SET is_featured = NOT is_featured WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Company benchmarking: company metrics vs market baseline ──
app.get("/api/employer/benchmark", (req, res) => {
  const { company_id = 1 } = req.query;
  const emps = db.prepare(`SELECT budget_total, budget_spent FROM users
    WHERE company_id = ? AND role='employee'`).all(company_id);
  const n = emps.length || 1;
  const avgBudget = Math.round(emps.reduce((a, e) => a + e.budget_total, 0) / n);
  const util = (() => {
    const tot = emps.reduce((a, e) => a + e.budget_total, 0);
    const sp = emps.reduce((a, e) => a + e.budget_spent, 0);
    return tot ? Math.round((sp / tot) * 100) : 0;
  })();
  const offered = db.prepare("SELECT COUNT(DISTINCT category) c FROM offers WHERE is_active=1").get().c;
  const company = db.prepare("SELECT glassdoor_rating FROM companies WHERE id=?").get(company_id);
  // Market baselines: Albanian tech-sector benefits benchmarks (industry reference figures).
  const market = { avgBudget: 9000, util: 61, categories: 5, rating: 3.9 };
  res.json({
    metrics: [
      { label: "Avg Budget / Employee", company: avgBudget, market: market.avgBudget, unit: " ALL" },
      { label: "Budget Utilization", company: util, market: market.util, unit: "%" },
      { label: "Benefit Categories", company: offered, market: market.categories, unit: "" },
      { label: "Glassdoor Rating", company: company?.glassdoor_rating || 0, market: market.rating, unit: "★" },
    ],
  });
});

// ── Multi-country offices ──
app.get("/api/employer/offices", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare("SELECT * FROM offices WHERE company_id = ? ORDER BY is_hq DESC, country").all(company_id));
});

app.post("/api/employer/offices", (req, res) => {
  const { company_id = 1, country, city, currency, fx_to_all = 1, headcount = 0, budget_per_employee = 0 } = req.body;
  if (!country || !currency) return res.status(400).json({ error: "country and currency required" });
  const id = db.prepare(`INSERT INTO offices (company_id,country,city,currency,fx_to_all,headcount,budget_per_employee)
    VALUES (?,?,?,?,?,?,?)`).run(company_id, country, city || "", currency, fx_to_all, headcount, budget_per_employee).lastInsertRowid;
  res.json({ id });
});

app.delete("/api/employer/offices/:id", (req, res) => {
  db.prepare("DELETE FROM offices WHERE id = ? AND is_hq = 0").run(req.params.id);
  res.json({ ok: true });
});

// ── Recruitment perks package ──
app.get("/api/employer/recruitment", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare("SELECT * FROM recruitment_perks WHERE company_id = ? ORDER BY highlight DESC, id").all(company_id));
});

app.post("/api/employer/recruitment", (req, res) => {
  const { company_id = 1, title, description, highlight = 0 } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const id = db.prepare("INSERT INTO recruitment_perks (company_id,title,description,highlight) VALUES (?,?,?,?)")
    .run(company_id, title, description || "", highlight ? 1 : 0).lastInsertRowid;
  res.json({ id });
});

app.delete("/api/employer/recruitment/:id", (req, res) => {
  db.prepare("DELETE FROM recruitment_perks WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── AI benefit strategy: deterministic recommendations from real signals ──
app.get("/api/employer/strategy", (req, res) => {
  const { company_id = 1 } = req.query;
  const recs = [];
  // Signal 1: unused budget / low utilization
  const emps = db.prepare(`SELECT budget_total, budget_spent FROM users WHERE company_id=? AND role='employee'`).all(company_id);
  const tot = emps.reduce((a, e) => a + e.budget_total, 0);
  const sp = emps.reduce((a, e) => a + e.budget_spent, 0);
  const util = tot ? sp / tot : 0;
  if (util < 0.6) recs.push({ priority: "High", title: "Boost low utilization",
    detail: `Only ${Math.round(util * 100)}% of allocated budget is used. Launch a flash drop or peer-gifting campaign to convert ${(tot - sp).toLocaleString()} ALL of idle budget into engagement.` });
  // Signal 2: category concentration
  const byCat = db.prepare(`SELECT o.category, SUM(si.price_all) t FROM selection_items si
    JOIN offers o ON o.id = si.offer_id JOIN selections s ON s.id = si.selection_id
    JOIN users u ON u.id = s.employee_id WHERE u.company_id=? AND s.status='approved'
    GROUP BY o.category ORDER BY t DESC`).all(company_id);
  if (byCat.length) {
    const total = byCat.reduce((a, c) => a + c.t, 0);
    const top = byCat[0];
    if (top.t / total > 0.4) recs.push({ priority: "Medium", title: "Diversify perk mix",
      detail: `${top.category} is ${Math.round((top.t / total) * 100)}% of spend. Feature offers in under-used categories to broaden adoption and lift the Happiness Score.` });
  }
  // Signal 3: unmet vendor demand
  const gaps = db.prepare(`SELECT category, COUNT(*) c FROM vendor_searches
    WHERE company_id=? AND matched=0 GROUP BY category ORDER BY c DESC LIMIT 1`).get(company_id);
  if (gaps) recs.push({ priority: "Medium", title: "Onboard a new vendor",
    detail: `Employees searched ${gaps.c}× for "${gaps.category}" with no match. Partner with a ${gaps.category} provider to meet demand.` });
  // Signal 4: provider concentration
  const provCount = db.prepare("SELECT COUNT(*) c FROM partnerships WHERE company_id=? AND status='active'").get(company_id).c;
  if (provCount < 5) recs.push({ priority: "Low", title: "Expand partnerships",
    detail: `${provCount} active provider partnerships. Adding 1-2 more (e.g. Travel, Education) increases choice without raising per-employee cost.` });
  res.json({ utilization: Math.round(util * 100), recommendations: recs });
});

// ════════════ PROVIDER ════════════

// All offers for a provider (active + inactive) with live performance stats.
app.get("/api/provider/offers", (req, res) => {
  const { provider_id } = req.query;
  if (!provider_id) return res.status(400).json({ error: "provider_id required" });
  const rows = db.prepare("SELECT * FROM offers WHERE provider_id = ? ORDER BY id").all(provider_id);
  res.json(rows.map((o) => {
    const stats = db.prepare(`SELECT COUNT(*) picks, COALESCE(SUM(price_all),0) revenue
      FROM selection_items WHERE offer_id = ?`).get(o.id);
    return { ...o, picks: stats.picks, revenue: stats.revenue };
  }));
});

// Create offer (extended fields).
app.post("/api/provider/offers", (req, res) => {
  const { provider_id, title, description, category, price_all, discount_pct = 0, capacity = 0, deal_ends = null, target_group = null, image_url = null } = req.body;
  if (!provider_id || !title || !price_all) return res.status(400).json({ error: "provider_id, title, price_all required" });
  const id = db.prepare(`INSERT INTO offers (provider_id,title,description,category,price_all,discount_pct,capacity,deal_ends,target_group,image_url)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(provider_id, title, description || "", category || "", price_all, discount_pct, capacity, deal_ends, target_group, image_url).lastInsertRowid;
  res.json({ id });
});

// Update offer (edit / set discount / deal / capacity / targeting / image).
app.put("/api/provider/offers/:id", (req, res) => {
  const cur = db.prepare("SELECT * FROM offers WHERE id = ?").get(req.params.id);
  if (!cur) return res.status(404).json({ error: "not found" });
  const f = { ...cur, ...req.body };
  db.prepare(`UPDATE offers SET title=?, description=?, category=?, price_all=?, discount_pct=?, capacity=?, deal_ends=?, target_group=?, image_url=? WHERE id=?`)
    .run(f.title, f.description, f.category, f.price_all, f.discount_pct, f.capacity, f.deal_ends, f.target_group, f.image_url, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/provider/offers/:id", (req, res) => {
  db.prepare("DELETE FROM offers WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Provider packages (bundles).
app.get("/api/provider/packages", (req, res) => {
  const { provider_id } = req.query;
  const pkgs = db.prepare("SELECT * FROM packages WHERE provider_id = ?").all(provider_id);
  const link = db.prepare(`SELECT o.* FROM package_offers po JOIN offers o ON o.id = po.offer_id WHERE po.package_id = ?`);
  res.json(pkgs.map((pk) => ({ ...pk, offers: link.all(pk.id) })));
});

app.post("/api/provider/packages", (req, res) => {
  const { provider_id, title, description, offer_ids = [] } = req.body;
  if (!provider_id || !title || offer_ids.length < 2) return res.status(400).json({ error: "provider_id, title, 2+ offers required" });
  const offers = offer_ids.map((id) => db.prepare("SELECT price_all FROM offers WHERE id = ?").get(id)).filter(Boolean);
  const total = offers.reduce((a, o) => a + o.price_all, 0);
  const tx = db.transaction(() => {
    const pkgId = db.prepare("INSERT INTO packages (provider_id,title,description,total_price_all) VALUES (?,?,?,?)")
      .run(provider_id, title, description || "", total).lastInsertRowid;
    const link = db.prepare("INSERT INTO package_offers (package_id,offer_id) VALUES (?,?)");
    for (const id of offer_ids) link.run(pkgId, id);
    return pkgId;
  });
  res.json({ id: tx(), total });
});

app.delete("/api/provider/packages/:id", (req, res) => {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM package_offers WHERE package_id = ?").run(req.params.id);
    db.prepare("DELETE FROM packages WHERE id = ?").run(req.params.id);
  });
  tx();
  res.json({ ok: true });
});

// Bookings / redemptions for a provider (paid transactions).
app.get("/api/provider/bookings", (req, res) => {
  const { provider_id } = req.query;
  res.json(db.prepare(`SELECT t.*, u.name AS employee, o.title AS offer
    FROM transactions t JOIN selections s ON s.id = t.selection_id
    JOIN users u ON u.id = s.employee_id
    LEFT JOIN selection_items si ON si.selection_id = s.id AND si.offer_id IN (SELECT id FROM offers WHERE provider_id = ?)
    LEFT JOIN offers o ON o.id = si.offer_id
    WHERE t.provider_id = ? ORDER BY t.created_at DESC`).all(provider_id, provider_id));
});

// Revenue & payouts summary.
app.get("/api/provider/revenue", (req, res) => {
  const { provider_id } = req.query;
  const total = db.prepare("SELECT COALESCE(SUM(amount_all),0) t, COUNT(*) c FROM transactions WHERE provider_id = ?").get(provider_id);
  const monthly = db.prepare(`SELECT strftime('%Y-%m', created_at) ym, SUM(amount_all) revenue
    FROM transactions WHERE provider_id = ? GROUP BY ym ORDER BY ym`).all(provider_id);
  // Platform fee 8%; net payout to provider.
  const fee = Math.round(total.t * 0.08);
  res.json({
    gross: total.t, fee, net: total.t - fee, bookings: total.c,
    series: monthly.map((m) => ({ month: MONTHS[Number(m.ym.split("-")[1]) - 1], revenue: m.revenue })),
  });
});

// Offer performance analytics (picks + revenue per offer).
app.get("/api/provider/analytics", (req, res) => {
  const { provider_id } = req.query;
  const offers = db.prepare("SELECT id, title FROM offers WHERE provider_id = ?").all(provider_id);
  res.json(offers.map((o) => {
    const st = db.prepare("SELECT COUNT(*) picks, COALESCE(SUM(price_all),0) revenue FROM selection_items WHERE offer_id = ?").get(o.id);
    const rating = db.prepare("SELECT AVG(rating) r, COUNT(*) c FROM reviews WHERE offer_id = ?").get(o.id);
    return { title: o.title, picks: st.picks, revenue: st.revenue, rating: rating.r ? Math.round(rating.r * 10) / 10 : null, reviews: rating.c };
  }));
});

// Reviews + replies.
app.get("/api/provider/reviews", (req, res) => {
  const { provider_id } = req.query;
  res.json(db.prepare(`SELECT r.*, u.name AS employee, o.title AS offer
    FROM reviews r JOIN users u ON u.id = r.employee_id
    JOIN offers o ON o.id = r.offer_id
    WHERE r.provider_id = ? ORDER BY r.created_at DESC`).all(provider_id));
});

app.put("/api/provider/reviews/:id/reply", (req, res) => {
  const { reply } = req.body;
  db.prepare("UPDATE reviews SET reply = ? WHERE id = ?").run(reply || "", req.params.id);
  res.json({ ok: true });
});

// Provider company profile.
app.get("/api/provider/profile", (req, res) => {
  const { provider_id } = req.query;
  res.json(db.prepare("SELECT * FROM providers WHERE id = ?").get(provider_id));
});

app.put("/api/provider/profile", (req, res) => {
  const { provider_id, company_name, description, logo_emoji, tagline, address, phone } = req.body;
  db.prepare(`UPDATE providers SET company_name=?, description=?, logo_emoji=?, tagline=?, address=?, phone=? WHERE id=?`)
    .run(company_name, description, logo_emoji, tagline, address, phone, provider_id);
  res.json({ ok: true });
});

// AI offer optimization: deterministic pricing/bundle/copy suggestions from real data.
app.get("/api/provider/optimize", (req, res) => {
  const { provider_id } = req.query;
  const offers = db.prepare("SELECT * FROM offers WHERE provider_id = ?").all(provider_id);
  const cat = offers[0]?.category;
  // Market median price for this category across all providers (real comparison).
  const peers = cat ? db.prepare("SELECT price_all FROM offers WHERE category = ? AND provider_id != ?").all(cat, provider_id) : [];
  const median = peers.length ? peers.map((p) => p.price_all).sort((a, b) => a - b)[Math.floor(peers.length / 2)] : null;
  const tips = [];
  for (const o of offers) {
    const st = db.prepare("SELECT COUNT(*) picks FROM selection_items WHERE offer_id = ?").get(o.id);
    if (median && o.price_all > median * 1.25)
      tips.push({ offer: o.title, type: "Pricing", text: `Priced ${Math.round((o.price_all / median - 1) * 100)}% above category median (${median.toLocaleString()} ALL). Consider a small discount to lift conversions.` });
    if (st.picks === 0)
      tips.push({ offer: o.title, type: "Visibility", text: `No redemptions yet. Add a limited-time deal or feature it to drive first bookings.` });
    if (!o.description || o.description.length < 25)
      tips.push({ offer: o.title, type: "Copy", text: `Description is short. Add benefits & what's included to improve click-through.` });
  }
  // Bundle suggestion: two most-picked offers not yet bundled together.
  if (offers.length >= 2) {
    const ranked = offers.map((o) => ({ o, picks: db.prepare("SELECT COUNT(*) c FROM selection_items WHERE offer_id=?").get(o.id).c }))
      .sort((a, b) => b.picks - a.picks);
    tips.push({ offer: "New bundle", type: "Bundle", text: `Bundle "${ranked[0].o.title}" + "${ranked[1].o.title}" at a slight discount — top performers sell well together.` });
  }
  res.json({ median, tips });
});

// ════════════ EMPLOYEE (mobile) ════════════

const empOfferCols = `o.*, p.company_name AS provider, p.logo_emoji AS provider_emoji,
  p.address, p.lat, p.lng`;

// Personalized home feed: featured, live deals, and recommendations from spend history.
app.get("/api/employee/feed", (req, res) => {
  const { employee_id } = req.query;
  if (!employee_id) return res.status(400).json({ error: "employee_id required" });
  const today = new Date().toISOString().slice(0, 10);
  const featured = db.prepare(`SELECT ${empOfferCols} FROM offers o JOIN providers p ON p.id = o.provider_id
    WHERE o.is_active = 1 AND o.is_featured = 1`).all();
  const deals = db.prepare(`SELECT ${empOfferCols} FROM offers o JOIN providers p ON p.id = o.provider_id
    WHERE o.is_active = 1 AND ((o.discount_pct > 0) OR (o.deal_ends IS NOT NULL AND o.deal_ends >= ?))`).all(today);
  // Recommend by the employee's top spent category; fall back to most-picked overall.
  const topCat = db.prepare(`SELECT o.category, SUM(si.price_all) t
    FROM selection_items si JOIN offers o ON o.id = si.offer_id
    JOIN selections s ON s.id = si.selection_id
    WHERE s.employee_id = ? AND s.status='approved' GROUP BY o.category ORDER BY t DESC LIMIT 1`).get(employee_id);
  const recommended = topCat
    ? db.prepare(`SELECT ${empOfferCols} FROM offers o JOIN providers p ON p.id = o.provider_id
        WHERE o.is_active=1 AND o.category=? ORDER BY o.is_featured DESC LIMIT 6`).all(topCat.category)
    : db.prepare(`SELECT ${empOfferCols},
        (SELECT COUNT(*) FROM selection_items si WHERE si.offer_id=o.id) picks
        FROM offers o JOIN providers p ON p.id = o.provider_id
        WHERE o.is_active=1 ORDER BY picks DESC LIMIT 6`).all();
  res.json({ featured, deals, recommended, topCategory: topCat?.category || null });
});

// Nearby offers: providers with coords, distance computed client-side from device GPS.
app.get("/api/employee/nearby", (req, res) => {
  res.json(db.prepare(`SELECT ${empOfferCols} FROM offers o JOIN providers p ON p.id = o.provider_id
    WHERE o.is_active=1 AND p.lat IS NOT NULL ORDER BY p.company_name`).all());
});

// ---- Perxify: swipe-based preference learning ----

// Deck: active offers the employee hasn't swiped yet. Liked-category offers
// float up so the deck keeps feeding what they're into.
app.get("/api/perxify/deck", requireAuth(), (req, res) => {
  const eid = req.authUser.id;
  res.json(db.prepare(`SELECT ${empOfferCols},
      (SELECT COALESCE(SUM(CASE action WHEN 'superlike' THEN 3 WHEN 'like' THEN 1 WHEN 'dislike' THEN -2 ELSE 0 END),0)
       FROM swipes s WHERE s.employee_id=? AND s.category=o.category) AS cat_score
    FROM offers o JOIN providers p ON p.id = o.provider_id
    WHERE o.is_active=1
      AND o.id NOT IN (SELECT offer_id FROM swipes WHERE employee_id=?)
    ORDER BY cat_score DESC, o.is_featured DESC, RANDOM() LIMIT 30`).all(eid, eid));
});

// Record a swipe. Upsert so re-swiping the same card just updates the action.
app.post("/api/perxify/swipe", requireAuth(), (req, res) => {
  const eid = req.authUser.id;
  const { offer_id, action } = req.body;
  if (!offer_id || !["like", "dislike", "superlike", "skip"].includes(action))
    return res.status(400).json({ error: "offer_id and valid action required" });
  const cat = db.prepare("SELECT category FROM offers WHERE id=?").get(offer_id)?.category;
  db.prepare(`INSERT INTO swipes (employee_id,offer_id,category,action) VALUES (?,?,?,?)
    ON CONFLICT(employee_id,offer_id) DO UPDATE SET action=excluded.action, created_at=datetime('now')`)
    .run(eid, offer_id, cat, action);
  res.json({ ok: true });
});

// Preference profile + recs: category weights from swipes, top offers in the
// employee's favored categories (excluding disliked + already-swiped).
app.get("/api/perxify/recommendations", requireAuth(), (req, res) => {
  const eid = req.authUser.id;
  const weights = db.prepare(`SELECT category,
      SUM(CASE action WHEN 'superlike' THEN 3 WHEN 'like' THEN 1 WHEN 'dislike' THEN -2 ELSE 0 END) AS weight,
      SUM(action IN ('like','superlike')) AS likes
    FROM swipes WHERE employee_id=? GROUP BY category ORDER BY weight DESC`).all(eid);
  const liked = weights.filter((w) => w.weight > 0);
  const offers = liked.length
    ? db.prepare(`SELECT ${empOfferCols} FROM offers o JOIN providers p ON p.id=o.provider_id
        WHERE o.is_active=1 AND o.category IN (${liked.map(() => "?").join(",")})
          AND o.id NOT IN (SELECT offer_id FROM swipes WHERE employee_id=? AND action='dislike')
        ORDER BY o.is_featured DESC LIMIT 8`).all(...liked.map((w) => w.category), eid)
    : [];
  res.json({ topCategories: liked.map((w) => w.category), weights, offers });
});

// HR analytics: anonymous category popularity across the company's employees.
app.get("/api/hr/perxify-analytics", requireAuth("hr"), (req, res) => {
  const company_id = req.authUser.company_id || 1;
  res.json(db.prepare(`SELECT s.category,
      SUM(s.action IN ('like','superlike')) AS likes,
      SUM(s.action='superlike') AS superlikes,
      SUM(s.action='dislike') AS dislikes,
      COUNT(*) AS total
    FROM swipes s JOIN users u ON u.id=s.employee_id
    WHERE u.company_id=? AND s.category IS NOT NULL
    GROUP BY s.category ORDER BY likes DESC`).all(company_id));
});

// Bookmarks
app.get("/api/employee/bookmarks", (req, res) => {
  const { employee_id } = req.query;
  res.json(db.prepare(`SELECT b.id AS bookmark_id, ${empOfferCols}
    FROM bookmarks b JOIN offers o ON o.id = b.offer_id
    JOIN providers p ON p.id = o.provider_id
    WHERE b.employee_id = ? ORDER BY b.created_at DESC`).all(employee_id));
});

app.post("/api/employee/bookmarks", (req, res) => {
  const { employee_id, offer_id } = req.body;
  if (!employee_id || !offer_id) return res.status(400).json({ error: "employee_id and offer_id required" });
  const exists = db.prepare("SELECT id FROM bookmarks WHERE employee_id=? AND offer_id=?").get(employee_id, offer_id);
  if (exists) { db.prepare("DELETE FROM bookmarks WHERE id=?").run(exists.id); return res.json({ saved: false }); }
  db.prepare("INSERT INTO bookmarks (employee_id,offer_id) VALUES (?,?)").run(employee_id, offer_id);
  res.json({ saved: true });
});

// Deal notifications: flash drops + featured/discounted offers as a feed.
app.get("/api/employee/notifications", (req, res) => {
  const { company_id = 1 } = req.query;
  const today = new Date().toISOString().slice(0, 10);
  const drops = db.prepare(`SELECT f.*, o.title AS offer_title FROM flash_drops f
    LEFT JOIN offers o ON o.id = f.offer_id WHERE f.company_id = ? ORDER BY f.ends_at DESC`).all(company_id);
  const notifs = drops.map((d) => ({
    type: "flash_drop", title: d.title, body: d.description,
    bonus: d.bonus_all, live: d.ends_at >= today && d.starts_at <= today, when: d.starts_at,
  }));
  const deals = db.prepare(`SELECT o.title, p.company_name provider, o.discount_pct
    FROM offers o JOIN providers p ON p.id = o.provider_id WHERE o.discount_pct > 0 AND o.is_active=1`).all();
  for (const d of deals) notifs.push({ type: "discount", title: `${d.discount_pct}% off ${d.title}`, body: `Limited deal at ${d.provider}`, live: true });
  res.json(notifs);
});

// Challenges + this employee's progress / streak.
app.get("/api/employee/challenges", (req, res) => {
  const { employee_id, company_id = 1 } = req.query;
  const rows = db.prepare("SELECT * FROM challenges WHERE company_id=? AND is_active=1").all(company_id);
  res.json(rows.map((c) => {
    const mine = db.prepare("SELECT completed FROM challenge_progress WHERE challenge_id=? AND employee_id=?").get(c.id, employee_id);
    const participants = db.prepare("SELECT COUNT(*) c FROM challenge_progress WHERE challenge_id=?").get(c.id).c;
    const done = db.prepare("SELECT COUNT(*) c FROM challenge_progress WHERE challenge_id=? AND completed=1").get(c.id).c;
    return { ...c, joined: !!mine, completed: mine?.completed === 1, participants, completed_count: done };
  }));
});

app.post("/api/employee/challenges/:id/join", (req, res) => {
  const { employee_id } = req.body;
  if (!employee_id) return res.status(400).json({ error: "employee_id required" });
  const exists = db.prepare("SELECT id FROM challenge_progress WHERE challenge_id=? AND employee_id=?").get(req.params.id, employee_id);
  if (!exists) db.prepare("INSERT INTO challenge_progress (challenge_id,employee_id,completed) VALUES (?,?,0)").run(req.params.id, employee_id);
  res.json({ ok: true });
});

// Achievements derived from real activity (no static badges).
app.get("/api/employee/achievements", (req, res) => {
  const { employee_id } = req.query;
  const approved = db.prepare("SELECT COUNT(*) c FROM selections WHERE employee_id=? AND status='approved'").get(employee_id).c;
  const cats = db.prepare(`SELECT COUNT(DISTINCT o.category) c FROM selection_items si
    JOIN offers o ON o.id=si.offer_id JOIN selections s ON s.id=si.selection_id
    WHERE s.employee_id=? AND s.status='approved'`).get(employee_id).c;
  const challengesDone = db.prepare("SELECT COUNT(*) c FROM challenge_progress WHERE employee_id=? AND completed=1").get(employee_id).c;
  const gifted = db.prepare("SELECT COUNT(*) c FROM gifts WHERE from_employee=?").get(employee_id).c;
  const reviews = db.prepare("SELECT COUNT(*) c FROM reviews WHERE employee_id=?").get(employee_id).c;
  res.json([
    { key: "first_redeem", emoji: "🎉", title: "First Redemption", unlocked: approved >= 1, hint: "Redeem your first benefit" },
    { key: "explorer", emoji: "🧭", title: "Explorer", unlocked: cats >= 3, hint: "Try 3 different categories", progress: `${cats}/3` },
    { key: "challenger", emoji: "🏆", title: "Challenger", unlocked: challengesDone >= 1, hint: "Complete a challenge" },
    { key: "generous", emoji: "🎁", title: "Generous", unlocked: gifted >= 1, hint: "Gift a colleague" },
    { key: "reviewer", emoji: "⭐", title: "Critic", unlocked: reviews >= 1, hint: "Leave a review" },
    { key: "power_user", emoji: "🔥", title: "Power User", unlocked: approved >= 5, hint: "Redeem 5 benefits", progress: `${approved}/5` },
  ]);
});

// Year in Benefits summary (real spend).
app.get("/api/employee/summary", (req, res) => {
  const { employee_id } = req.query;
  const me = db.prepare("SELECT name, budget_total, budget_spent FROM users WHERE id=?").get(employee_id) || {};
  const byCat = db.prepare(`SELECT o.category, SUM(si.price_all) total, COUNT(*) count
    FROM selection_items si JOIN offers o ON o.id=si.offer_id
    JOIN selections s ON s.id=si.selection_id
    WHERE s.employee_id=? AND s.status='approved' GROUP BY o.category ORDER BY total DESC`).all(employee_id);
  const totalSpent = byCat.reduce((a, c) => a + c.total, 0);
  const totalRedeemed = db.prepare("SELECT COUNT(*) c FROM selections WHERE employee_id=? AND status='approved'").get(employee_id).c;
  const fav = db.prepare(`SELECT p.company_name, COUNT(*) c FROM selection_items si
    JOIN offers o ON o.id=si.offer_id JOIN providers p ON p.id=o.provider_id
    JOIN selections s ON s.id=si.selection_id
    WHERE s.employee_id=? AND s.status='approved' GROUP BY p.id ORDER BY c DESC LIMIT 1`).get(employee_id);
  res.json({
    name: me.name, totalSpent, totalRedeemed, byCat,
    topCategory: byCat[0]?.category || null,
    favoriteProvider: fav?.company_name || null,
    taxSaved: Math.round(totalSpent * 0.23),
  });
});

// Employee creates a review for an offer they redeemed.
app.post("/api/employee/reviews", (req, res) => {
  const { employee_id, offer_id, rating, comment } = req.body;
  if (!employee_id || !offer_id || !rating) return res.status(400).json({ error: "employee_id, offer_id, rating required" });
  const offer = db.prepare("SELECT provider_id FROM offers WHERE id=?").get(offer_id);
  if (!offer) return res.status(404).json({ error: "offer not found" });
  const id = db.prepare(`INSERT INTO reviews (provider_id,offer_id,employee_id,rating,comment)
    VALUES (?,?,?,?,?)`).run(offer.provider_id, offer_id, employee_id, rating, comment || "").lastInsertRowid;
  res.json({ id });
});

// Offers the employee has redeemed (eligible to review), with whether already reviewed.
app.get("/api/employee/redeemed", (req, res) => {
  const { employee_id } = req.query;
  const rows = db.prepare(`SELECT DISTINCT o.id, o.title, o.category, p.company_name provider
    FROM selection_items si JOIN offers o ON o.id=si.offer_id
    JOIN providers p ON p.id=o.provider_id
    JOIN selections s ON s.id=si.selection_id
    WHERE s.employee_id=? AND s.status='approved'`).all(employee_id);
  res.json(rows.map((o) => ({
    ...o, reviewed: !!db.prepare("SELECT id FROM reviews WHERE employee_id=? AND offer_id=?").get(employee_id, o.id),
  })));
});

// ── Employee: recurring subscriptions (auto-renew) ──
app.get("/api/employee/subscriptions", (req, res) => {
  const { employee_id } = req.query;
  res.json(db.prepare(`SELECT sub.*, o.title, o.category, p.company_name AS provider
    FROM subscriptions sub JOIN offers o ON o.id = sub.offer_id
    JOIN providers p ON p.id = o.provider_id
    WHERE sub.employee_id = ? ORDER BY sub.active DESC, sub.next_run`).all(employee_id));
});

app.post("/api/employee/subscriptions", (req, res) => {
  const employee_id = req.authUser.id;
  const { offer_id } = req.body;
  const offer = db.prepare("SELECT price_all FROM offers WHERE id = ?").get(offer_id);
  if (!offer) return res.status(404).json({ error: "offer not found" });
  const exists = db.prepare("SELECT id FROM subscriptions WHERE employee_id=? AND offer_id=? AND active=1").get(employee_id, offer_id);
  if (exists) return res.json({ id: exists.id, already: true });
  // Next run = first of next month.
  const d = new Date(); const next = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
  const id = db.prepare("INSERT INTO subscriptions (employee_id,offer_id,price_all,next_run) VALUES (?,?,?,?)")
    .run(employee_id, offer_id, offer.price_all, next).lastInsertRowid;
  res.json({ id });
});

app.delete("/api/employee/subscriptions/:id", (req, res) => {
  // Only cancel your own.
  db.prepare("UPDATE subscriptions SET active = 0 WHERE id = ? AND employee_id = ?").run(req.params.id, req.authUser.id);
  res.json({ ok: true });
});

// Process due renewals: create a fresh (pending) selection for each active sub past next_run.
// In production a cron hits this; here employer/HR can trigger it for the demo.
app.post("/api/subscriptions/process", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const due = db.prepare("SELECT * FROM subscriptions WHERE active = 1 AND next_run <= ?").all(today);
  let created = 0;
  const advance = (dateStr) => { const d = new Date(dateStr); return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10); };
  const tx = db.transaction(() => {
    for (const sub of due) {
      const emp = db.prepare("SELECT budget_total, budget_spent FROM users WHERE id = ?").get(sub.employee_id);
      if (!emp || sub.price_all > emp.budget_total - emp.budget_spent) continue; // skip if over budget
      const selId = db.prepare("INSERT INTO selections (employee_id,total_amount,status) VALUES (?,?,'pending')")
        .run(sub.employee_id, sub.price_all).lastInsertRowid;
      db.prepare("INSERT INTO selection_items (selection_id,offer_id,price_all) VALUES (?,?,?)")
        .run(selId, sub.offer_id, sub.price_all);
      db.prepare("UPDATE subscriptions SET last_run = ?, next_run = ? WHERE id = ?")
        .run(today, advance(sub.next_run), sub.id);
      created++;
    }
  });
  tx();
  res.json({ processed: due.length, created });
});

// ── Employer: provider-meeting calendar ──
app.get("/api/employer/meetings", (req, res) => {
  const { company_id = 1 } = req.query;
  res.json(db.prepare(`SELECT m.*, p.company_name AS provider, p.logo_emoji AS provider_emoji
    FROM meetings m LEFT JOIN providers p ON p.id = m.provider_id
    WHERE m.company_id = ? ORDER BY m.date, m.time`).all(company_id));
});

app.post("/api/employer/meetings", (req, res) => {
  const { company_id = 1, provider_id, title, date, time, location, notes } = req.body;
  if (!title || !date) return res.status(400).json({ error: "title and date required" });
  const id = db.prepare(`INSERT INTO meetings (company_id,provider_id,title,date,time,location,notes)
    VALUES (?,?,?,?,?,?,?)`).run(company_id, provider_id || null, title, date, time || "", location || "", notes || "").lastInsertRowid;
  res.json({ id });
});

app.delete("/api/employer/meetings/:id", (req, res) => {
  db.prepare("DELETE FROM meetings WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
// Only start the server when run directly; tests import `app` without binding a port.
if (require.main === module) {
  app.listen(PORT, () => console.log(`Perx API on http://localhost:${PORT}`));
}

module.exports = { app };
