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
  // Android emulator maps host loopback to 10.0.2.2
  const resolved = ip === "localhost" && Platform.OS === "android" ? "10.0.2.2" : ip;
  return `http://${resolved}:3001`;
}

export const BASE = apiBase();

const json = (r) => r.json();
const h = { "content-type": "application/json" };

export const api = {
  offers: () => fetch(`${BASE}/api/offers`).then(json),
  packages: () => fetch(`${BASE}/api/packages`).then(json),
  employees: (cid = 1) => fetch(`${BASE}/api/employees?company_id=${cid}`).then(json),
  selections: (eid) => fetch(`${BASE}/api/selections?employee_id=${eid}`).then(json),
  createSelection: (body) =>
    fetch(`${BASE}/api/selections`, { method: "POST", headers: h, body: JSON.stringify(body) }).then(json),
  concierge: (message, employee_id) =>
    fetch(`${BASE}/api/concierge`, { method: "POST", headers: h, body: JSON.stringify({ message, employee_id }) }).then(json),
};

// Demo: employee is always Arta (#1).
export const EMPLOYEE_ID = 1;
