const json = (r) => r.json();

// Dev: Vite proxy handles /api. Packaged Electron (file://) has no proxy -> hit the API directly.
const BASE = import.meta.env.PROD ? "http://localhost:3001" : "";

export const api = {
  offers: () => fetch(BASE + "/api/offers").then(json),
  packages: () => fetch(BASE + "/api/packages").then(json),
  catalog: () => fetch(BASE + "/api/catalog").then(json),
  providers: () => fetch(BASE + "/api/providers").then(json),

  createSelection: (body) =>
    fetch(BASE + "/api/selections", { method: "POST", headers: h, body: JSON.stringify(body) }).then(json),
  selections: (employee_id) => fetch(BASE + `/api/selections?employee_id=${employee_id}`).then(json),
  pending: (company_id = 1) => fetch(BASE + `/api/selections/pending?company_id=${company_id}`).then(json),
  approve: (id) => fetch(BASE + `/api/selections/${id}/approve`, { method: "PUT" }).then(json),
  reject: (id) => fetch(BASE + `/api/selections/${id}/reject`, { method: "PUT" }).then(json),

  employees: (company_id = 1) => fetch(BASE + `/api/employees?company_id=${company_id}`).then(json),
  updateEmployeeBudget: (id, budget_total) =>
    fetch(BASE + `/api/employees/${id}/budget`, { method: "PUT", headers: h, body: JSON.stringify({ budget_total }) }).then(json),
  payments: (provider_id) =>
    fetch(BASE + `/api/payments${provider_id ? `?provider_id=${provider_id}` : ""}`).then(json),
  analytics: (company_id = 1) => fetch(BASE + `/api/analytics?company_id=${company_id}`).then(json),

  hrTable: (company_id = 1) => fetch(BASE + `/api/hr/table?company_id=${company_id}`).then(json),
  hrCompliance: (company_id = 1) => fetch(BASE + `/api/hr/compliance?company_id=${company_id}`).then(json),
  hrNudge: (company_id = 1) => fetch(BASE + `/api/hr/nudge?company_id=${company_id}`).then(json),
  hrChallenges: (company_id = 1) => fetch(BASE + `/api/hr/challenges?company_id=${company_id}`).then(json),
  createChallenge: (body) =>
    fetch(BASE + "/api/hr/challenges", { method: "POST", headers: h, body: JSON.stringify(body) }).then(json),

  concierge: (message, employee_id) =>
    fetch(BASE + "/api/concierge", { method: "POST", headers: h, body: JSON.stringify({ message, employee_id }) }).then(json),

  addOffer: (body) =>
    fetch(BASE + "/api/offers", { method: "POST", headers: h, body: JSON.stringify(body) }).then(json),
  toggleOffer: (id) => fetch(BASE + `/api/offers/${id}/toggle`, { method: "PUT" }).then(json),
};

const h = { "content-type": "application/json" };

// ponytail: localStorage session, no auth — demo only
export const session = {
  get: () => { try { return JSON.parse(localStorage.getItem("perx")); } catch { return null; } },
  set: (u) => localStorage.setItem("perx", JSON.stringify(u)),
  clear: () => localStorage.removeItem("perx"),
};

// Seeded employee/employer/hr ids for the no-auth demo.
export const DEMO = { employeeId: 1, employerCompany: 1, hrCompany: 1, providerId: 3 /* Zen Spa */ };

export const fmt = (n) => Number(n || 0).toLocaleString() + " ALL";
