import { useState, useEffect } from "react";
import { motion, AnimatePresence, NumberTicker, BlurFade } from "../components/ui.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ApprovalRow from "../components/ApprovalRow.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Toast from "../components/Toast.jsx";
import { DesktopShell } from "../components/Shells.jsx";
import { api, fmt } from "../lib/api.js";

const NAV = ["Overview", "Approvals", "Team", "Payments"];

export default function EmployerDashboard() {
  const [view, setView] = useState("Overview");
  const [toast, setToast] = useState("");

  return (
    <DesktopShell>
      <Sidebar nav={NAV} active={view} onChange={setView} />
      <main style={{ flex: 1, padding: 32, minHeight: 760 }}>
        <h1 style={{ marginBottom: 24, color: "var(--text)" }}>{view}</h1>
        {view === "Overview" && <Overview />}
        {view === "Approvals" && <Approvals onToast={setToast} />}
        {view === "Team" && <Team />}
        {view === "Payments" && <Payments />}
      </main>
      <Toast message={toast} />
    </DesktopShell>
  );
}

function Overview() {
  const [emps, setEmps] = useState([]);
  const [pending, setPending] = useState([]);
  const [payments, setPayments] = useState([]);
  useEffect(() => {
    api.employees().then(setEmps);
    api.pending().then(setPending);
    api.payments().then(setPayments);
  }, []);
  const totalBudget = emps.reduce((s, e) => s + e.budget_total, 0);
  const totalSpent = emps.reduce((s, e) => s + e.budget_spent, 0);
  const stats = [
    { label: "Team Members", value: emps.length },
    { label: "Pending Approvals", value: pending.length },
    { label: "Budget Allocated", value: totalBudget, all: true },
    { label: "Spent This Month", value: totalSpent, all: true },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
      {stats.map((s, i) => (
        <BlurFade key={s.label} delay={i * 0.08}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent)" }}>
              <NumberTicker value={s.value} />{s.all ? " ALL" : ""}
            </div>
            <div style={{ color: "var(--text-secondary)", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
          </div>
        </BlurFade>
      ))}
    </div>
  );
}

function Approvals({ onToast }) {
  const [pending, setPending] = useState([]);
  const [done, setDone] = useState({});
  useEffect(() => { api.pending().then(setPending); }, []);

  async function approve(id) {
    setDone((d) => ({ ...d, [id]: true }));
    await api.approve(id);
    onToast("Approved — payment sent to providers");
    setTimeout(() => onToast(""), 3000);
    setTimeout(() => setPending((p) => p.filter((s) => s.id !== id)), 900);
  }
  async function reject(id) {
    await api.reject(id);
    setPending((p) => p.filter((s) => s.id !== id));
    onToast("Request rejected");
    setTimeout(() => onToast(""), 3000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700 }}>
      {pending.length === 0 && <p className="muted">No pending approvals. All caught up. 🌊</p>}
      <AnimatePresence>
        {pending.map((s) => (
          <ApprovalRow key={s.id} sel={s} onApprove={approve} onReject={reject} done={done[s.id]} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function pctColor(remaining, total) {
  const p = total ? remaining / total : 0;
  if (p > 0.5) return "var(--accent)";
  if (p >= 0.2) return "var(--surface)";
  return "#b3261e";
}

function Team() {
  const [emps, setEmps] = useState([]);
  useEffect(() => { api.employees().then(setEmps); }, []);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--dark)", color: "var(--text-on-dark)", textAlign: "left" }}>
            {["Employee", "Department", "Budget", "Spent", "Remaining", ""].map((h) => (
              <th key={h} style={{ padding: 14, fontSize: 13 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {emps.map((e, i) => {
            const remaining = e.budget_total - e.budget_spent;
            const pct = e.budget_total ? (e.budget_spent / e.budget_total) * 100 : 0;
            return (
              <motion.tr key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                style={{ borderBottom: "1px solid var(--border)" }}
                whileHover={{ backgroundColor: "rgba(193,217,222,.4)" }}>
                <td style={{ padding: 14, fontWeight: 600 }}>{e.name}</td>
                <td style={{ padding: 14 }} className="muted">{e.department}</td>
                <td style={{ padding: 14 }}>{fmt(e.budget_total)}</td>
                <td style={{ padding: 14 }}>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 99, width: 90, overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                      style={{ height: "100%", background: "var(--accent)" }} />
                  </div>
                </td>
                <td style={{ padding: 14, fontWeight: 700, color: pctColor(remaining, e.budget_total) }}>
                  {fmt(remaining)}
                </td>
                <td />
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Payments() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.payments().then(setRows); }, []);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--dark)", color: "var(--text-on-dark)", textAlign: "left" }}>
            {["Date", "Employee", "Provider", "Amount", "Status"].map((h) =>
              <th key={h} style={{ padding: 14, fontSize: 13 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} style={{ padding: 20 }} className="muted">No payments yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: 14 }} className="muted">{r.created_at?.slice(0, 10)}</td>
              <td style={{ padding: 14 }}>{r.employee}</td>
              <td style={{ padding: 14 }}>{r.provider}</td>
              <td style={{ padding: 14, fontWeight: 700, color: "var(--accent)" }}>{fmt(r.amount_all)}</td>
              <td style={{ padding: 14 }}><StatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
