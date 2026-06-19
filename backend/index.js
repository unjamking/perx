require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const { db, seed } = require("./database");
const { concierge } = require("./concierge");

// Seed on boot if empty so `npm run dev` just works.
if (db.prepare("SELECT COUNT(*) c FROM companies").get().c === 0) seed();

const app = express();
app.use(cors());
app.use(express.json());

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
  const { employee_id, items, gift_to } = req.body; // items: [{offer_id, price_all}]
  if (!employee_id || !items?.length) return res.status(400).json({ error: "employee_id and items required" });
  const total = items.reduce((s, i) => s + i.price_all, 0);
  const emp = db.prepare("SELECT budget_total, budget_spent FROM users WHERE id = ?").get(employee_id);
  if (!emp) return res.status(404).json({ error: "employee not found" });
  // Server-side budget guard: never approve more than the employee has left.
  if (total > emp.budget_total - emp.budget_spent)
    return res.status(400).json({ error: "exceeds remaining budget" });
  const tx = db.transaction(() => {
    const selId = db.prepare(
      "INSERT INTO selections (employee_id,total_amount,gift_to) VALUES (?,?,?)")
      .run(employee_id, total, gift_to || null).lastInsertRowid;
    const insItem = db.prepare(
      "INSERT INTO selection_items (selection_id,offer_id,price_all) VALUES (?,?,?)");
    for (const i of items) insItem.run(selId, i.offer_id, i.price_all);
    return selId;
  });
  res.json({ id: tx(), total });
});

const itemsFor = db.prepare(`
  SELECT si.*, o.title, o.category, p.company_name AS provider, p.id AS provider_id
  FROM selection_items si JOIN offers o ON o.id = si.offer_id
  JOIN providers p ON p.id = o.provider_id WHERE si.selection_id = ?`);

function hydrate(sel) {
  const emp = db.prepare("SELECT name FROM users WHERE id = ?").get(sel.employee_id);
  return { ...sel, employee_name: emp?.name, items: itemsFor.all(sel.id) };
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
  const tx = db.transaction(() => {
    db.prepare("UPDATE selections SET status = 'approved' WHERE id = ?").run(id);
    db.prepare("UPDATE users SET budget_spent = budget_spent + ? WHERE id = ?")
      .run(sel.total_amount, sel.employee_id);
    const insTx = db.prepare(
      "INSERT INTO transactions (selection_id,provider_id,amount_all,status) VALUES (?,?,?,'paid')");
    for (const it of itemsFor.all(id)) insTx.run(id, it.provider_id, it.price_all);
  });
  tx();
  res.json({ ok: true });
});

app.put("/api/selections/:id/reject", (req, res) => {
  db.prepare("UPDATE selections SET status = 'rejected' WHERE id = ?").run(req.params.id);
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
  const result = db.prepare("UPDATE users SET budget_total = ? WHERE id = ?").run(Number(budget_total), id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "employee not found" });
  }
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
  // Synthetic monthly trend for the line chart (demo).
  const trend = [
    { month: "Jan", spend: 32000 }, { month: "Feb", spend: 41000 },
    { month: "Mar", spend: 38000 }, { month: "Apr", spend: 52000 },
    { month: "May", spend: 47000 }, { month: "Jun", spend: liveSpend(company_id) },
  ];
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
  const { message, employee_id } = req.body;
  const emp = db.prepare("SELECT budget_total, budget_spent FROM users WHERE id = ?").get(employee_id) || {};
  const budget_remaining = (emp.budget_total || 10000) - (emp.budget_spent || 0);
  const catalog = db.prepare(`${offerWithProvider} WHERE o.is_active = 1`).all()
    .map((o) => ({ id: o.id, title: o.title, provider: o.provider, category: o.category, price_all: o.price_all }));
  try {
    res.json(await concierge({ message, budget_remaining, catalog }));
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Perx API on http://localhost:${PORT}`));
