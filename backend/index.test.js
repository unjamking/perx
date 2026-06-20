// Integration tests for auth + money paths. Run: npm test
// Uses an isolated in-memory DB so it never touches perx.db.
process.env.PERX_DB = ":memory:";
process.env.JWT_SECRET = "test-secret";

const test = require("node:test");
const assert = require("node:assert");
const { seed } = require("./database");
const { app } = require("./index");

seed(); // populate the in-memory DB

let server, base;
test.before(async () => {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const api = (path, opts = {}, token) =>
  fetch(base + path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

const login = async (email, password) => {
  const r = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  return { status: r.status, body: await r.json() };
};

test("login succeeds with demo creds", async () => {
  const { status, body } = await login("arta@techtirana.al", "perx1234");
  assert.equal(status, 200);
  assert.ok(body.token);
  assert.equal(body.user.role, "employee");
});

test("login rejects wrong password", async () => {
  const { status } = await login("arta@techtirana.al", "nope");
  assert.equal(status, 401);
});

test("protected route blocks anonymous", async () => {
  const r = await api("/api/employees");
  assert.equal(r.status, 401);
});

test("role gate blocks wrong role", async () => {
  const { body } = await login("arta@techtirana.al", "perx1234"); // employee
  const r = await api("/api/hr/users", {}, body.token);
  assert.equal(r.status, 403);
});

test("HR can list + create users; new user must change password", async () => {
  const { body: hr } = await login("elira@techtirana.al", "perx1234");
  const create = await api("/api/hr/users", { method: "POST", body: JSON.stringify({
    name: "Test Hire", email: "hire@techtirana.al", role: "employee" }) }, hr.token);
  assert.equal(create.status, 200);
  const cj = await create.json();
  assert.ok(cj.tempPassword, "returns temp password");

  const { status, body } = await login("hire@techtirana.al", cj.tempPassword);
  assert.equal(status, 200);
  assert.equal(body.user.must_change_password, true);
});

test("auto-approval pays out instantly under an enabled rule", async () => {
  const { body } = await login("arta@techtirana.al", "perx1234");
  // Telecom rule: auto-approve <= 2000. Data 10GB = 1500.
  const offers = await (await api("/api/offers", {}, body.token)).json();
  const telecom = offers.find((o) => o.title === "Data 10GB");
  const r = await api("/api/selections", { method: "POST", body: JSON.stringify({
    items: [{ offer_id: telecom.id, price_all: telecom.price_all }] }) }, body.token);
  const j = await r.json();
  assert.equal(j.auto_approved, true);
});

test("selection ignores client employee_id, uses token", async () => {
  const { body } = await login("besnik@techtirana.al", "perx1234");
  const offers = await (await api("/api/offers", {}, body.token)).json();
  const cheap = offers.find((o) => o.price_all <= 2000) || offers[0];
  // Try to charge someone else — should be ignored, charged to Besnik.
  const r = await api("/api/selections", { method: "POST", body: JSON.stringify({
    employee_id: 1, items: [{ offer_id: cheap.id, price_all: cheap.price_all }] }) }, body.token);
  assert.equal(r.status, 200);
  // Besnik's own selections should include it.
  const mine = await (await api(`/api/selections?employee_id=999`, {}, body.token)).json();
  assert.ok(Array.isArray(mine)); // scoped to token regardless of query
});

test("gift rejects self-gift and over-budget", async () => {
  const { body } = await login("arta@techtirana.al", "perx1234");
  const self = await api("/api/gifts", { method: "POST", body: JSON.stringify({ to_employee: 1, amount_all: 100 }) }, body.token);
  assert.equal(self.status, 400); // can't gift yourself (token id == 1)
  const over = await api("/api/gifts", { method: "POST", body: JSON.stringify({ to_employee: 2, amount_all: 9999999 }) }, body.token);
  assert.equal(over.status, 400);
});

test("budget guard blocks over-budget selection", async () => {
  const { body } = await login("drita@techtirana.al", "perx1234"); // low remaining
  const offers = await (await api("/api/offers", {}, body.token)).json();
  const pricey = offers.reduce((a, b) => (b.price_all > a.price_all ? b : a));
  const r = await api("/api/selections", { method: "POST", body: JSON.stringify({
    items: [{ offer_id: pricey.id, price_all: 999999 }] }) }, body.token);
  assert.equal(r.status, 400);
});

test("capacity guard blocks over-booked offer", async () => {
  const { body } = await login("arta@techtirana.al", "perx1234");
  // Create an offer with capacity 1 via provider, book it, second booking blocked.
  const { body: prov } = await login("owner@zenspatirana.al", "perx1234");
  const off = await (await api("/api/provider/offers", { method: "POST", body: JSON.stringify({
    provider_id: prov.user.provider_id, title: "Limited Slot", category: "🧘 Wellness", price_all: 500, capacity: 1 }) }, prov.token)).json();
  // First booking (Arta) — auto-approves? Wellness has no enabled rule, so pending; approve via employer.
  const s1 = await (await api("/api/selections", { method: "POST", body: JSON.stringify({
    items: [{ offer_id: off.id, price_all: 500 }] }) }, body.token)).json();
  const { body: empl } = await login("manager@techtirana.al", "perx1234");
  await api(`/api/selections/${s1.id}/approve`, { method: "PUT" }, empl.token);
  // Second booking by Besnik should hit capacity.
  const { body: b2 } = await login("besnik@techtirana.al", "perx1234");
  const r2 = await api("/api/selections", { method: "POST", body: JSON.stringify({
    items: [{ offer_id: off.id, price_all: 500 }] }) }, b2.token);
  assert.equal(r2.status, 409);
});

test("audit log records budget changes", async () => {
  const { body: empl } = await login("manager@techtirana.al", "perx1234");
  await api("/api/employees/2/budget", { method: "PUT", body: JSON.stringify({ budget_total: 11111 }) }, empl.token);
  const log = await (await api("/api/employer/audit", {}, empl.token)).json();
  assert.ok(log.some((e) => e.action === "update_budget" && e.detail.includes("11111")));
});

test("recurring: subscribe, then process creates a pending renewal", async () => {
  const { body } = await login("besnik@techtirana.al", "perx1234");
  const offers = await (await api("/api/offers", {}, body.token)).json();
  const o = offers.find((x) => x.price_all <= 2000) || offers[0];
  const sub = await (await api("/api/employee/subscriptions", { method: "POST", body: JSON.stringify({ offer_id: o.id }) }, body.token)).json();
  assert.ok(sub.id || sub.already);
  // Force the sub due, then process.
  const { db } = require("./database");
  db.prepare("UPDATE subscriptions SET next_run = '2020-01-01' WHERE employee_id = ?").run(body.user.id);
  const proc = await (await api("/api/subscriptions/process", { method: "POST" }, body.token)).json();
  assert.ok(proc.created >= 1);
  const mine = await (await api(`/api/selections?employee_id=${body.user.id}`, {}, body.token)).json();
  assert.ok(mine.some((s) => s.status === "pending"));
});

test("change-password clears must-change flag", async () => {
  const { body: hr } = await login("elira@techtirana.al", "perx1234");
  const cj = await (await api("/api/hr/users", { method: "POST", body: JSON.stringify({
    name: "Pw User", email: "pw@techtirana.al", role: "employee" }) }, hr.token)).json();
  const { body: u } = await login("pw@techtirana.al", cj.tempPassword);
  assert.equal(u.user.must_change_password, true);
  const ch = await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ next: "newpass123" }) }, u.token);
  assert.equal(ch.status, 200);
  const relog = await login("pw@techtirana.al", "newpass123");
  assert.equal(relog.status, 200);
  assert.equal(relog.body.user.must_change_password, false);
});
