import Constants from "expo-constants";
import { Platform } from "react-native";

// Phone/simulator can't reach the host's "localhost". Derive the dev machine's
// LAN IP from Expo's host URI; fall back to localhost for web/simulator.
function apiBase() {
  const host =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expogo?.debuggerHost;
  const ip = host ? host.split(":")[0] : "localhost";
  const resolved = ip === "localhost" && Platform.OS === "android" ? "10.0.2.2" : ip;
  return `http://${resolved}:3001`;
}

export const BASE = apiBase();

// JWT held in memory, kept in sync by AuthContext. A 401 handler can be registered
// so the app force-logs-out on a stale token.
let TOKEN = null;
let onUnauthorized = null;
export const setToken = (t) => { TOKEN = t; };
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function req(path, { method = "GET", body } = {}) {
  const headers = { "content-type": "application/json", ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) };
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && !path.startsWith("/api/auth/login") && onUnauthorized) onUnauthorized();
  return res.json();
}

export const api = {
  login: (body) => req("/api/auth/login", { method: "POST", body }),
  me: () => req("/api/auth/me"),
  changePassword: (body) => req("/api/auth/change-password", { method: "POST", body }),
  registerPush: (token) => req("/api/push/register", { method: "POST", body: { token } }),

  offers: () => req("/api/offers"),
  packages: () => req("/api/packages"),
  providers: () => req("/api/providers"),
  employees: () => req("/api/employees"),
  selections: (eid) => req(`/api/selections?employee_id=${eid}`),
  createSelection: (body) => req("/api/selections", { method: "POST", body }),
  concierge: (message, employee_id, lang) => req("/api/concierge", { method: "POST", body: { message, employee_id, lang } }),

  // Employee
  feed: (eid) => req(`/api/employee/feed?employee_id=${eid}`),
  nearby: () => req("/api/employee/nearby"),
  // Perxify (swipe-based prefs) — employee_id comes from the token
  perxifyDeck: () => req("/api/perxify/deck"),
  perxifySwipe: (offer_id, action) => req("/api/perxify/swipe", { method: "POST", body: { offer_id, action } }),
  perxifyRecs: () => req("/api/perxify/recommendations"),
  bookmarks: (eid) => req(`/api/employee/bookmarks?employee_id=${eid}`),
  toggleBookmark: (employee_id, offer_id) => req("/api/employee/bookmarks", { method: "POST", body: { employee_id, offer_id } }),
  notifications: () => req("/api/employee/notifications"),
  challenges: (eid) => req(`/api/employee/challenges?employee_id=${eid}`),
  joinChallenge: (id, employee_id) => req(`/api/employee/challenges/${id}/join`, { method: "POST", body: { employee_id } }),
  completeChallenge: (id, employee_id) => req(`/api/employee/challenges/${id}/complete`, { method: "POST", body: { employee_id } }),
  achievements: (eid) => req(`/api/employee/achievements?employee_id=${eid}`),
  summary: (eid) => req(`/api/employee/summary?employee_id=${eid}`),
  redeemed: (eid) => req(`/api/employee/redeemed?employee_id=${eid}`),
  createReview: (body) => req("/api/employee/reviews", { method: "POST", body }),
  sendGift: (body) => req("/api/gifts", { method: "POST", body }),
  subscriptions: (eid) => req(`/api/employee/subscriptions?employee_id=${eid}`),
  subscribe: (offer_id) => req("/api/employee/subscriptions", { method: "POST", body: { offer_id } }),
  unsubscribe: (id) => req(`/api/employee/subscriptions/${id}`, { method: "DELETE" }),
};

// Current employee id — set on login, read by screens. Defaults to demo Arta until auth resolves.
export let EMPLOYEE_ID = 1;
export const setEmployeeId = (id) => { EMPLOYEE_ID = id; };
