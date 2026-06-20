// Dev: Vite proxy handles /api. Packaged Electron (file://) has no proxy -> hit the API directly.
const BASE = import.meta.env.PROD ? "http://localhost:3001" : "";

// Session: JWT token + user persisted in localStorage.
export const session = {
  get: () => { try { return JSON.parse(localStorage.getItem("perx")); } catch { return null; } },
  set: (data) => localStorage.setItem("perx", JSON.stringify(data)), // { token, user }
  clear: () => localStorage.removeItem("perx"),
  token: () => { try { return JSON.parse(localStorage.getItem("perx"))?.token || null; } catch { return null; } },
  user: () => { try { return JSON.parse(localStorage.getItem("perx"))?.user || null; } catch { return null; } },
};

// Single authenticated fetcher. Attaches the JWT to every call; on 401 it clears the
// session and bounces to the login screen so a stale token can't wedge the app.
async function req(path, { method = "GET", body } = {}) {
  const token = session.token();
  const headers = { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && !path.startsWith("/api/auth/login")) {
    session.clear();
    if (location.hash !== "#/" && location.pathname !== "/") location.assign(import.meta.env.PROD ? "index.html" : "/");
  }
  return res.json();
}

export const api = {
  offers: () => req("/api/offers"),
  packages: () => req("/api/packages"),
  catalog: () => req("/api/catalog"),
  providers: () => req("/api/providers"),

  createSelection: (body) => req("/api/selections", { method: "POST", body }),
  selections: (employee_id) => req(`/api/selections?employee_id=${employee_id}`),
  pending: (company_id = 1) => req(`/api/selections/pending?company_id=${company_id}`),
  approve: (id) => req(`/api/selections/${id}/approve`, { method: "PUT" }),
  reject: (id) => req(`/api/selections/${id}/reject`, { method: "PUT" }),

  employees: (company_id = 1) => req(`/api/employees?company_id=${company_id}`),
  updateEmployeeBudget: (id, budget_total) => req(`/api/employees/${id}/budget`, { method: "PUT", body: { budget_total } }),
  payments: (provider_id) => req(`/api/payments${provider_id ? `?provider_id=${provider_id}` : ""}`),
  analytics: (company_id = 1) => req(`/api/analytics?company_id=${company_id}`),

  hrTable: (company_id = 1) => req(`/api/hr/table?company_id=${company_id}`),
  hrCompliance: (company_id = 1) => req(`/api/hr/compliance?company_id=${company_id}`),
  hrNudge: (company_id = 1) => req(`/api/hr/nudge?company_id=${company_id}`),
  hrChallenges: (company_id = 1) => req(`/api/hr/challenges?company_id=${company_id}`),
  createChallenge: (body) => req("/api/hr/challenges", { method: "POST", body }),

  hrForecast: (company_id = 1) => req(`/api/hr/forecast?company_id=${company_id}`),
  hrSentiment: (company_id = 1) => req(`/api/hr/sentiment?company_id=${company_id}`),
  hrProviderMatches: (company_id = 1) => req(`/api/hr/provider-matches?company_id=${company_id}`),
  hrAutoRules: (company_id = 1) => req(`/api/hr/auto-rules?company_id=${company_id}`),
  createAutoRule: (body) => req("/api/hr/auto-rules", { method: "POST", body }),
  toggleAutoRule: (id) => req(`/api/hr/auto-rules/${id}/toggle`, { method: "PUT" }),
  hrFlashDrops: (company_id = 1) => req(`/api/hr/flash-drops?company_id=${company_id}`),
  createFlashDrop: (body) => req("/api/hr/flash-drops", { method: "POST", body }),
  hrGifts: (company_id = 1) => req(`/api/hr/gifts?company_id=${company_id}`),
  hrPayouts: (company_id = 1) => req(`/api/hr/payouts?company_id=${company_id}`),
  departments: (company_id = 1) => req(`/api/departments?company_id=${company_id}`),
  allocateBudget: (body) => req("/api/hr/allocate", { method: "POST", body }),
  hrAudit: () => req("/api/hr/audit"),
  employerAudit: () => req("/api/employer/audit"),

  // Employer
  employerCompany: (company_id = 1) => req(`/api/employer/company?company_id=${company_id}`),
  updateCompany: (body) => req("/api/employer/company", { method: "PUT", body }),
  policies: (company_id = 1) => req(`/api/employer/policies?company_id=${company_id}`),
  updatePolicy: (id, body) => req(`/api/employer/policies/${id}`, { method: "PUT", body }),
  partnerships: (company_id = 1) => req(`/api/employer/partnerships?company_id=${company_id}`),
  addPartnership: (body) => req("/api/employer/partnerships", { method: "POST", body }),
  removePartnership: (provider_id) => req(`/api/employer/partnerships/${provider_id}`, { method: "DELETE" }),
  marketplace: () => req("/api/employer/marketplace"),
  featureOffer: (id) => req(`/api/employer/offers/${id}/feature`, { method: "PUT" }),
  benchmark: (company_id = 1) => req(`/api/employer/benchmark?company_id=${company_id}`),
  offices: (company_id = 1) => req(`/api/employer/offices?company_id=${company_id}`),
  addOffice: (body) => req("/api/employer/offices", { method: "POST", body }),
  removeOffice: (id) => req(`/api/employer/offices/${id}`, { method: "DELETE" }),
  recruitment: (company_id = 1) => req(`/api/employer/recruitment?company_id=${company_id}`),
  addRecruitPerk: (body) => req("/api/employer/recruitment", { method: "POST", body }),
  removeRecruitPerk: (id) => req(`/api/employer/recruitment/${id}`, { method: "DELETE" }),
  strategy: (company_id = 1) => req(`/api/employer/strategy?company_id=${company_id}`),
  meetings: (company_id = 1) => req(`/api/employer/meetings?company_id=${company_id}`),
  createMeeting: (body) => req("/api/employer/meetings", { method: "POST", body }),
  deleteMeeting: (id) => req(`/api/employer/meetings/${id}`, { method: "DELETE" }),

  // Provider
  providerOffers: (provider_id) => req(`/api/provider/offers?provider_id=${provider_id}`),
  createProviderOffer: (body) => req("/api/provider/offers", { method: "POST", body }),
  updateProviderOffer: (id, body) => req(`/api/provider/offers/${id}`, { method: "PUT", body }),
  deleteProviderOffer: (id) => req(`/api/provider/offers/${id}`, { method: "DELETE" }),
  providerPackages: (provider_id) => req(`/api/provider/packages?provider_id=${provider_id}`),
  createProviderPackage: (body) => req("/api/provider/packages", { method: "POST", body }),
  deleteProviderPackage: (id) => req(`/api/provider/packages/${id}`, { method: "DELETE" }),
  providerBookings: (provider_id) => req(`/api/provider/bookings?provider_id=${provider_id}`),
  providerRevenue: (provider_id) => req(`/api/provider/revenue?provider_id=${provider_id}`),
  providerAnalytics: (provider_id) => req(`/api/provider/analytics?provider_id=${provider_id}`),
  providerReviews: (provider_id) => req(`/api/provider/reviews?provider_id=${provider_id}`),
  replyReview: (id, reply) => req(`/api/provider/reviews/${id}/reply`, { method: "PUT", body: { reply } }),
  providerProfile: (provider_id) => req(`/api/provider/profile?provider_id=${provider_id}`),
  updateProviderProfile: (body) => req("/api/provider/profile", { method: "PUT", body }),
  providerOptimize: (provider_id) => req(`/api/provider/optimize?provider_id=${provider_id}`),

  // Auth
  login: (body) => req("/api/auth/login", { method: "POST", body }),
  me: () => req("/api/auth/me"),
  changePassword: (body) => req("/api/auth/change-password", { method: "POST", body }),

  // HR user management
  hrUsers: () => req("/api/hr/users"),
  createHrUser: (body) => req("/api/hr/users", { method: "POST", body }),
  resetHrUser: (id) => req(`/api/hr/users/${id}/reset`, { method: "PUT" }),

  concierge: (message, employee_id) => req("/api/concierge", { method: "POST", body: { message, employee_id } }),

  addOffer: (body) => req("/api/offers", { method: "POST", body }),
  toggleOffer: (id) => req(`/api/offers/${id}/toggle`, { method: "PUT" }),
};

export const roleRoute = { employer: "/employer", hr: "/hr", provider: "/provider", employee: "/employer" };

// Seeded employee/employer/hr ids for the no-auth demo.
export const DEMO = { employeeId: 1, employerCompany: 1, hrCompany: 1, providerId: 3 /* Zen Spa */ };

export const fmt = (n) => Number(n || 0).toLocaleString() + " ALL";
