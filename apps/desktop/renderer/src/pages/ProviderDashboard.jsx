import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "../components/ui.jsx";
import { ShimmerButton } from "../components/ui.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { DesktopShell } from "../components/Shells.jsx";
import { api, fmt, DEMO } from "../lib/api.js";

export default function ProviderDashboard() {
  const nav = useNavigate();
  const providerId = DEMO.providerId; // demo: Zen Spa Tirana
  const [offers, setOffers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", category: "🧘 Wellness", price_all: "" });
  const [shake, setShake] = useState(false);

  const load = () => {
    api.offers().then((all) => setOffers(all.filter((o) => o.provider_id === providerId)));
    api.payments(providerId).then(setPayments);
  };
  useEffect(() => { load(); }, []);

  async function toggle(id) {
    await api.toggleOffer(id);
    // optimistic; offers() only returns active, so reload full set unfiltered isn't available — flip locally
    setOffers((os) => os.map((o) => o.id === id ? { ...o, is_active: o.is_active ? 0 : 1 } : o));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title || !form.price_all) { setShake(true); setTimeout(() => setShake(false), 500); return; }
    await api.addOffer({ provider_id: providerId, ...form, price_all: Number(form.price_all) });
    setForm({ title: "", description: "", category: "🧘 Wellness", price_all: "" });
    load();
  }

  return (
    <DesktopShell>
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px", width: "100%", minHeight: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 style={{ color: "var(--text)" }}>Provider Dashboard</h1>
        <button className="btn btn-outline" onClick={() => nav("/")}>Exit</button>
      </div>

      <h3 style={{ marginBottom: 12 }}>My Offers</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {offers.map((o) => (
          <motion.div key={o.id} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}
            whileHover={{ y: -2 }}>
            <span style={{ fontSize: 28 }}>{o.category.split(" ")[0]}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{o.title}</div>
              <div className="muted" style={{ fontSize: 13 }}>{fmt(o.price_all)}</div>
            </div>
            <span className="tag">{payments.length} redemptions</span>
            <button onClick={() => toggle(o.id)}
              style={{ width: 48, height: 28, borderRadius: 99, padding: 3, display: "flex",
                justifyContent: o.is_active ? "flex-end" : "flex-start",
                background: o.is_active ? "var(--accent)" : "var(--surface)" }}>
              <motion.div layout style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff" }} />
            </button>
          </motion.div>
        ))}
      </div>

      <h3 style={{ marginBottom: 12 }}>Incoming Payments</h3>
      <div className="card" style={{ overflow: "hidden", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--dark)", color: "var(--text-on-dark)", textAlign: "left" }}>
              {["Date", "Amount", "Employee", "Status"].map((h) =>
                <th key={h} style={{ padding: 12, fontSize: 13 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && <tr><td colSpan={4} style={{ padding: 18 }} className="muted">No payments yet.</td></tr>}
            {payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: 12 }} className="muted">{p.created_at?.slice(0, 10)}</td>
                <td style={{ padding: 12, fontWeight: 700, color: "var(--accent)" }}>{fmt(p.amount_all)}</td>
                <td style={{ padding: 12 }}>{p.employee?.[0]}***</td>
                <td style={{ padding: 12 }}><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 12 }}>Add New Offer</h3>
      <motion.form onSubmit={submit} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}
        animate={shake ? { x: [0, -8, 8, -8, 0] } : {}}>
        <input className="input" placeholder="Title" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {["💪 Fitness", "🍽️ Food", "🧘 Wellness", "✈️ Travel", "📱 Telecom", "📚 Education"].map((c) =>
            <option key={c}>{c}</option>)}
        </select>
        <input className="input" type="number" placeholder="Price (ALL)" value={form.price_all}
          onChange={(e) => setForm({ ...form, price_all: e.target.value })} />
        <ShimmerButton style={{ width: "100%" }}>Add Offer →</ShimmerButton>
      </motion.form>
    </div>
    </DesktopShell>
  );
}
