import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion, AnimatePresence, NumberTicker, ShimmerButton, MagneticButton } from "../components/ui.jsx";
import ApprovalRow from "../components/ApprovalRow.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Toast from "../components/Toast.jsx";
import { DesktopShell } from "../components/Shells.jsx";
import Logout from "../components/Logout.jsx";
import AuditLog from "../components/AuditLog.jsx";
import { api, fmt } from "../lib/api.js";
import {
  LayoutGrid, CheckSquare, Users, CreditCard, ShieldCheck, Wallet, Handshake, Search,
  Store, Sparkles, BarChart3, Megaphone, Briefcase, Globe, Star, X, Trash2, Plus, Lock, Unlock,
  CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, ScrollText,
} from "lucide-react";
import s from "./HRDashboard.module.css";

const NAV = [
  { group: "Overview", items: [
    { id: "Overview", icon: LayoutGrid },
    { id: "AI Strategy", icon: Sparkles },
    { id: "Benchmarking", icon: BarChart3 },
  ]},
  { group: "Operations", items: [
    { id: "Approvals", icon: CheckSquare },
    { id: "Team", icon: Users },
    { id: "Payments", icon: CreditCard },
    { id: "Audit Log", icon: ScrollText },
  ]},
  { group: "Benefits", items: [
    { id: "Benefit Policies", icon: ShieldCheck },
    { id: "Budget Management", icon: Wallet },
    { id: "Marketplace Curation", icon: Store },
  ]},
  { group: "Providers", items: [
    { id: "Provider Partnerships", icon: Handshake },
    { id: "Provider Discovery", icon: Search },
    { id: "Calendar", icon: CalendarDays },
  ]},
  { group: "Brand & Reach", items: [
    { id: "Employer Branding", icon: Megaphone },
    { id: "Recruitment Perks", icon: Briefcase },
    { id: "Multi-Country", icon: Globe },
  ]},
];

export default function EmployerDashboard() {
  const [view, setView] = useState("Overview");
  const [toast, setToast] = useState("");
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } } };
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

  return (
    <DesktopShell>
      <div className={s.container}>
        <aside className={s.sidebar}>
          <div className={s.logo}>Perx</div>
          <nav className={s.nav}>
            {NAV.map((section) => (
              <div key={section.group} className={s.navGroup}>
                <div className={s.navGroupLabel}>{section.group}</div>
                {section.items.map(({ id, icon: Icon }) => {
                  const active = view === id;
                  return (
                    <button key={id} onClick={() => setView(id)} className={`${s.navLink} ${active ? s.activeNavLink : ""}`}>
                      {active && <motion.div layoutId="sidebar-active-pill" className={s.activePill}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                      <span className={s.navLinkInner}><Icon size={16} /> {id}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className={s.companyLabel}>TechTirana SH.P.K · Employer</div>
          <Logout subtitle="Employer Console" />
        </aside>

        <main className={s.mainContent}>
          <div className={s.sectionHeader}>
            <h1 className={s.sectionTitle}>{view}</h1>
            <p className={s.sectionSub}>TechTirana SH.P.K · Company Administration</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={view} variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {view === "Overview" && <Overview itemVariants={itemVariants} />}
              {view === "AI Strategy" && <AIStrategy itemVariants={itemVariants} />}
              {view === "Benchmarking" && <Benchmarking itemVariants={itemVariants} />}
              {view === "Approvals" && <Approvals onToast={flash} itemVariants={itemVariants} />}
              {view === "Team" && <Team itemVariants={itemVariants} />}
              {view === "Payments" && <Payments itemVariants={itemVariants} />}
              {view === "Benefit Policies" && <BenefitPolicies itemVariants={itemVariants} />}
              {view === "Budget Management" && <BudgetManagement itemVariants={itemVariants} />}
              {view === "Marketplace Curation" && <Marketplace onToast={flash} itemVariants={itemVariants} />}
              {view === "Provider Partnerships" && <Partnerships mode="active" onToast={flash} itemVariants={itemVariants} />}
              {view === "Provider Discovery" && <Partnerships mode="discover" onToast={flash} itemVariants={itemVariants} />}
              {view === "Employer Branding" && <Branding onToast={flash} itemVariants={itemVariants} />}
              {view === "Recruitment Perks" && <Recruitment itemVariants={itemVariants} />}
              {view === "Multi-Country" && <MultiCountry itemVariants={itemVariants} />}
              {view === "Calendar" && <Calendar onToast={flash} itemVariants={itemVariants} />}
              {view === "Audit Log" && <AuditLog source={api.employerAudit} itemVariants={itemVariants} />}
            </motion.div>
          </AnimatePresence>
        </main>
        <Toast message={toast} />
      </div>
    </DesktopShell>
  );
}

function Stat({ label, value, suffix }) {
  return (
    <div className={s.statCard}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}><NumberTicker value={value} suffix={suffix} /></div>
      <div className={s.statDecoration} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

function Empty({ msg }) {
  return <p style={{ color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: 24 }}>{msg}</p>;
}

/* ── Overview ── */
function Overview({ itemVariants }) {
  const [emps, setEmps] = useState([]);
  const [pending, setPending] = useState([]);
  const [strategy, setStrategy] = useState(null);
  useEffect(() => {
    api.employees().then(setEmps);
    api.pending().then(setPending);
    api.strategy().then(setStrategy);
  }, []);
  const totalBudget = emps.reduce((a, e) => a + e.budget_total, 0);
  const totalSpent = emps.reduce((a, e) => a + e.budget_spent, 0);

  return (
    <>
      <motion.div className={s.statsGrid} variants={itemVariants}>
        <Stat label="Team Members" value={emps.length} />
        <Stat label="Pending Approvals" value={pending.length} />
        <Stat label="Budget Allocated" value={totalBudget} suffix=" ALL" />
        <Stat label="Spent This Month" value={totalSpent} suffix=" ALL" />
      </motion.div>

      <motion.div variants={itemVariants} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <h4 className={s.cardTitle}><Sparkles size={16} /> Top Strategy Recommendation</h4>
        {strategy?.recommendations?.length ? (
          <div className={s.stratCard}>
            <span className={`${s.stratPriority} ${prioClass(strategy.recommendations[0].priority)}`}>{strategy.recommendations[0].priority}</span>
            <div>
              <div className={s.stratTitle}>{strategy.recommendations[0].title}</div>
              <div className={s.stratDetail}>{strategy.recommendations[0].detail}</div>
            </div>
          </div>
        ) : <Empty msg="No recommendations — benefits program is well-tuned. 🎉" />}
      </motion.div>
    </>
  );
}

function prioClass(p) {
  return p === "High" ? s.prioHigh : p === "Medium" ? s.prioMed : s.prioLow;
}

/* ── AI Strategy ── */
function AIStrategy({ itemVariants }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.strategy().then(setData); }, []);
  if (!data) return null;
  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 640 }}>
        Data-driven benefit strategy generated from your live utilization ({data.utilization}%), spend mix, vendor demand and partnership coverage.
      </p>
      {data.recommendations.map((r, i) => (
        <motion.div key={i} className={s.stratCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <span className={`${s.stratPriority} ${prioClass(r.priority)}`}>{r.priority}</span>
          <div>
            <div className={s.stratTitle}>{r.title}</div>
            <div className={s.stratDetail}>{r.detail}</div>
          </div>
        </motion.div>
      ))}
      {data.recommendations.length === 0 && <Empty msg="No recommendations — program well-tuned. 🎉" />}
    </motion.div>
  );
}

/* ── Benchmarking ── */
function Benchmarking({ itemVariants }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.benchmark().then(setData); }, []);
  if (!data) return null;
  const chart = data.metrics.map((m) => ({ name: m.label, Company: m.company, Market: m.market }));
  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={s.statsGrid}>
        {data.metrics.map((m) => {
          const ahead = m.company >= m.market;
          return (
            <div key={m.label} className={s.statCard}>
              <div className={s.statLabel}>{m.label}</div>
              <div className={s.statValue}>{m.company.toLocaleString()}{m.unit}</div>
              <div className={ahead ? s.greenText : s.redText} style={{ fontSize: 13 }}>
                {ahead ? "▲" : "▼"} Market: {m.market.toLocaleString()}{m.unit}
              </div>
              <div className={s.statDecoration} />
            </div>
          );
        })}
      </div>
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h4 className={s.cardTitle}><BarChart3 size={16} /> Company vs Albanian Tech Market</h4>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,94,104,0.08)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Legend />
              <Bar dataKey="Company" fill="#215E68" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Market" fill="#a6cacb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Approvals ── */
function Approvals({ onToast, itemVariants }) {
  const [pending, setPending] = useState([]);
  const [done, setDone] = useState({});
  useEffect(() => { api.pending().then(setPending); }, []);
  async function approve(id) {
    setDone((d) => ({ ...d, [id]: true }));
    await api.approve(id);
    onToast("Approved — payment sent to providers");
    setTimeout(() => setPending((p) => p.filter((x) => x.id !== id)), 900);
  }
  async function reject(id) {
    await api.reject(id);
    setPending((p) => p.filter((x) => x.id !== id));
    onToast("Request rejected");
  }
  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
      {pending.length === 0 && <Empty msg="No pending approvals. All caught up. 🌊" />}
      <AnimatePresence>
        {pending.map((sel) => <ApprovalRow key={sel.id} sel={sel} onApprove={approve} onReject={reject} done={done[sel.id]} />)}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Team ── */
function Team({ itemVariants }) {
  const [emps, setEmps] = useState([]);
  useEffect(() => { api.employees().then(setEmps); }, []);
  const remStyle = (rem, total) => {
    const p = total ? rem / total : 0;
    return p > 0.5 ? s.greenText : p >= 0.2 ? s.seafoamText : s.redText;
  };
  return (
    <motion.div variants={itemVariants} className={s.tableCard}>
      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead><tr>{["Employee", "Department", "Budget", "Spent", "Remaining"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {emps.map((e, i) => {
              const rem = e.budget_total - e.budget_spent;
              return (
                <motion.tr key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <td style={{ fontWeight: 600 }}>{e.name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{e.department}</td>
                  <td>{fmt(e.budget_total)}</td>
                  <td>{fmt(e.budget_spent)}</td>
                  <td className={remStyle(rem, e.budget_total)}>{fmt(rem)}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ── Payments ── */
function Payments({ itemVariants }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.payments().then(setRows); }, []);
  return (
    <motion.div variants={itemVariants} className={s.tableCard}>
      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead><tr>{["Date", "Employee", "Provider", "Amount", "Status"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>No payments yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ color: "var(--text-secondary)" }}>{r.created_at?.slice(0, 10)}</td>
                <td style={{ fontWeight: 600 }}>{r.employee}</td>
                <td>{r.provider}</td>
                <td style={{ fontWeight: 700, color: "var(--accent)" }}>{fmt(r.amount_all)}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ── Benefit Policies ── */
function BenefitPolicies({ itemVariants }) {
  const [policies, setPolicies] = useState([]);
  const load = () => api.policies().then(setPolicies);
  useEffect(() => { load(); }, []);
  const toggle = async (p) => {
    setPolicies((prev) => prev.map((x) => x.id === p.id ? { ...x, enabled: x.enabled ? 0 : 1 } : x));
    await api.updatePolicy(p.id, { enabled: p.enabled ? 0 : 1 });
  };
  const saveCap = async (p, val) => {
    const n = Number(val);
    if (isNaN(n)) return;
    setPolicies((prev) => prev.map((x) => x.id === p.id ? { ...x, max_per_month: n } : x));
    await api.updatePolicy(p.id, { max_per_month: n });
  };
  return (
    <motion.div variants={itemVariants} className={s.policyTogglesCard} style={{ maxWidth: 640 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)" }}>Benefit Policies</h3>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -8 }}>Enable categories company-wide and set a monthly spend cap per category.</p>
      <div className={s.policyList}>
        {policies.map((p) => (
          <div key={p.id} className={s.policyItem}>
            <div className={s.policyInfo}>
              <span className={s.policyLabel}>{p.category}</span>
              <span className={s.policySub}>
                {p.enabled
                  ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1a8754" }}><Unlock size={12} /> Enabled</span>
                  : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#dc3545" }}><Lock size={12} /> Disabled</span>}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="number" defaultValue={p.max_per_month} className={s.overrideInput} style={{ width: 110 }}
                onBlur={(e) => saveCap(p, e.target.value)} title="Monthly cap (ALL)" />
              <div className={s.switchTrack} style={{ backgroundColor: p.enabled ? "#215E68" : "#5C9396", justifyContent: p.enabled ? "flex-end" : "flex-start" }}
                onClick={() => toggle(p)}>
                <motion.div layout className={s.switchThumb} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Budget Management (per-office allocation overview) ── */
function BudgetManagement({ itemVariants }) {
  const [offices, setOffices] = useState([]);
  const [emps, setEmps] = useState([]);
  useEffect(() => { api.offices().then(setOffices); api.employees().then(setEmps); }, []);
  const totalSpent = emps.reduce((a, e) => a + e.budget_spent, 0);
  const totalBudget = emps.reduce((a, e) => a + e.budget_total, 0);
  // Per-office annual budget in ALL (headcount × monthly per-employee × fx × 12)
  const officeBudget = (o) => o.headcount * o.budget_per_employee * o.fx_to_all * 12;
  const grand = offices.reduce((a, o) => a + officeBudget(o), 0);

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={s.statsGrid} style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Stat label="HQ Budget Allocated" value={totalBudget} suffix=" ALL" />
        <Stat label="HQ Spent (MTD)" value={totalSpent} suffix=" ALL" />
        <Stat label="Global Annual Budget" value={Math.round(grand)} suffix=" ALL" />
      </div>
      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead><tr>{["Office", "Headcount", "Per Employee / mo", "Annual Budget (ALL)"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {offices.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{o.is_hq ? "🏛️ " : ""}{o.country} · {o.city}</td>
                  <td>{o.headcount}</td>
                  <td>{o.budget_per_employee.toLocaleString()} {o.currency}</td>
                  <td style={{ fontWeight: 700, color: "var(--accent)" }}>{Math.round(officeBudget(o)).toLocaleString()} ALL</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        Per-employee allocation and overrides are managed in the HR dashboard. This view rolls up budget across all country offices.
      </p>
    </motion.div>
  );
}

/* ── Marketplace Curation ── */
function Marketplace({ onToast, itemVariants }) {
  const [offers, setOffers] = useState([]);
  const load = () => api.marketplace().then(setOffers);
  useEffect(() => { load(); }, []);
  const feature = async (o) => {
    setOffers((prev) => prev.map((x) => x.id === o.id ? { ...x, is_featured: x.is_featured ? 0 : 1 } : x));
    await api.featureOffer(o.id);
    onToast(o.is_featured ? "Removed from featured" : "Featured in marketplace");
  };
  const toggle = async (o) => {
    setOffers((prev) => prev.map((x) => x.id === o.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x));
    await api.toggleOffer(o.id);
    onToast(o.is_active ? "Hidden from catalog" : "Shown in catalog");
  };
  return (
    <motion.div variants={itemVariants} className={s.tableCard}>
      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead><tr>{["Perk", "Provider", "Category", "Price", "Picks", "Featured", "Visible"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} style={{ cursor: "default" }}>
                <td style={{ fontWeight: 600 }}>{o.title}</td>
                <td style={{ color: "var(--text-secondary)" }}>{o.provider}</td>
                <td>{o.category}</td>
                <td>{fmt(o.price_all)}</td>
                <td><strong style={{ color: "var(--accent)" }}>{o.picks}</strong></td>
                <td>
                  <button onClick={() => feature(o)} className={s.iconStar} title="Toggle featured">
                    <Star size={18} fill={o.is_featured ? "#215E68" : "none"} color={o.is_featured ? "#215E68" : "#5C9396"} />
                  </button>
                </td>
                <td>
                  <div className={s.switchTrack} style={{ backgroundColor: o.is_active ? "#215E68" : "#5C9396", justifyContent: o.is_active ? "flex-end" : "flex-start" }}
                    onClick={() => toggle(o)}>
                    <motion.div layout className={s.switchThumb} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ── Partnerships (active) + Discovery (unpartnered) ── */
function Partnerships({ mode, onToast, itemVariants }) {
  const [list, setList] = useState([]);
  const load = () => api.partnerships().then(setList);
  useEffect(() => { load(); }, []);
  const shown = list.filter((p) => mode === "active" ? p.partnered : !p.partnered);

  const add = async (p) => { await api.addPartnership({ provider_id: p.id, discount_pct: 5 }); onToast(`Partnered with ${p.company_name}`); load(); };
  const remove = async (p) => { await api.removePartnership(p.id); onToast(`Ended partnership with ${p.company_name}`); load(); };

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 640 }}>
        {mode === "active"
          ? "Vendors your company has contracted, with negotiated discounts and real spend to date."
          : "Available Albanian vendors not yet partnered. Onboard them to expand the marketplace."}
      </p>
      <div className={s.matchGrid}>
        {shown.map((p) => (
          <motion.div key={p.id} className={s.matchCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={s.matchTop}>
              <span className={s.matchCat}>{p.company_name}</span>
              {mode === "active" && p.discount_pct > 0 && <span className={s.matchTagWarn}>{p.discount_pct}% off</span>}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{p.category} · {p.description}</div>
            {mode === "active" ? (
              <div className={s.matchStats}>
                <div><strong>{fmt(p.spend)}</strong> spent</div>
                <div><strong>{p.txns}</strong> txns</div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Not yet contracted</div>
            )}
            {mode === "active" ? (
              <MagneticButton onClick={() => remove(p)} className={s.nudgeBtn} style={{ width: "100%", background: "#dc3545" }}>
                <Trash2 size={14} /> End Partnership
              </MagneticButton>
            ) : (
              <MagneticButton onClick={() => add(p)} className={s.nudgeBtn} style={{ width: "100%" }}>
                <Handshake size={14} /> Partner
              </MagneticButton>
            )}
          </motion.div>
        ))}
        {shown.length === 0 && <Empty msg={mode === "active" ? "No active partnerships yet." : "All providers partnered. 🎉"} />}
      </div>
    </motion.div>
  );
}

/* ── Employer Branding ── */
function Branding({ onToast, itemVariants }) {
  const [c, setC] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.employerCompany().then(setC); }, []);
  if (!c) return null;
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCompany({ tagline: c.tagline, logo_emoji: c.logo_emoji, brand_color: c.brand_color, mission: c.mission, perks_headline: c.perks_headline });
      onToast("Employer profile saved");
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };
  return (
    <motion.div variants={itemVariants} className={s.challengesGrid}>
      <form className={s.formCard} onSubmit={save}>
        <h4 className={s.formTitle}>Employer Branding</h4>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Logo Emoji"><input className="input" value={c.logo_emoji || ""} onChange={(e) => setC({ ...c, logo_emoji: e.target.value })} /></Field>
          <Field label="Brand Color"><input type="color" className="input" style={{ height: 42, padding: 4 }} value={c.brand_color || "#215E68"} onChange={(e) => setC({ ...c, brand_color: e.target.value })} /></Field>
        </div>
        <Field label="Tagline"><input className="input" value={c.tagline || ""} onChange={(e) => setC({ ...c, tagline: e.target.value })} /></Field>
        <Field label="Mission"><textarea className="input" rows={3} value={c.mission || ""} onChange={(e) => setC({ ...c, mission: e.target.value })} /></Field>
        <Field label="Perks Headline"><input className="input" value={c.perks_headline || ""} onChange={(e) => setC({ ...c, perks_headline: e.target.value })} /></Field>
        <ShimmerButton type="submit" disabled={saving} style={{ marginTop: 8 }}>{saving ? "Saving…" : "Save Profile →"}</ShimmerButton>
      </form>

      {/* Live preview */}
      <div className={s.brandPreview} style={{ borderTop: `5px solid ${c.brand_color}` }}>
        <div className={s.brandLogo} style={{ background: c.brand_color + "1a" }}>{c.logo_emoji}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--dark)" }}>{c.name}</h2>
        <div style={{ color: c.brand_color, fontWeight: 700, fontSize: 14 }}>{c.tagline}</div>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{c.mission}</p>
        <div className={s.brandPerks} style={{ background: c.brand_color }}>★ {c.perks_headline}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>⭐ {c.glassdoor_rating} Glassdoor rating</div>
      </div>
    </motion.div>
  );
}

/* ── Recruitment Perks ── */
function Recruitment({ itemVariants }) {
  const [perks, setPerks] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", highlight: false });
  const [submitting, setSubmitting] = useState(false);
  const load = () => api.recruitment().then(setPerks);
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setSubmitting(true);
    try { await api.addRecruitPerk({ ...form, highlight: form.highlight ? 1 : 0 }); setForm({ title: "", description: "", highlight: false }); load(); }
    catch (err) { console.error(err); } finally { setSubmitting(false); }
  };
  const remove = async (id) => { await api.removeRecruitPerk(id); load(); };

  return (
    <motion.div variants={itemVariants} className={s.challengesGrid}>
      <div className={s.challengesList}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)", marginBottom: 4 }}>Public Recruitment Package</h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -8 }}>Perks shown to job candidates on your careers page.</p>
        {perks.map((p) => (
          <div key={p.id} className={s.challengeCard}>
            <div className={s.challengeTop}>
              <div className={s.challengeTitle}>{p.highlight ? "★ " : ""}{p.title}</div>
              <button className={s.iconStar} onClick={() => remove(p.id)} title="Remove"><Trash2 size={16} color="#dc3545" /></button>
            </div>
            <div className={s.challengeDesc}>{p.description}</div>
          </div>
        ))}
        {perks.length === 0 && <Empty msg="No recruitment perks yet." />}
      </div>
      <form className={s.formCard} onSubmit={add}>
        <h4 className={s.formTitle}>Add Perk</h4>
        <Field label="Title"><input className="input" placeholder="e.g. Flexible Benefits Wallet" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={form.highlight} onChange={(e) => setForm({ ...form, highlight: e.target.checked })} /> Highlight on careers page
        </label>
        <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 8 }}><Plus size={14} style={{ verticalAlign: "-2px" }} /> Add Perk</ShimmerButton>
      </form>
    </motion.div>
  );
}

/* ── Multi-Country ── */
function MultiCountry({ itemVariants }) {
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState({ country: "", city: "", currency: "EUR", fx_to_all: "", headcount: "", budget_per_employee: "" });
  const [submitting, setSubmitting] = useState(false);
  const load = () => api.offices().then(setOffices);
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault();
    if (!form.country || !form.currency) return;
    setSubmitting(true);
    try {
      await api.addOffice({ ...form, fx_to_all: Number(form.fx_to_all) || 1, headcount: Number(form.headcount) || 0, budget_per_employee: Number(form.budget_per_employee) || 0 });
      setForm({ country: "", city: "", currency: "EUR", fx_to_all: "", headcount: "", budget_per_employee: "" });
      load();
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };
  const remove = async (id) => { await api.removeOffice(id); load(); };
  const totalHead = offices.reduce((a, o) => a + o.headcount, 0);

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={s.statsGrid} style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Stat label="Country Offices" value={offices.length} />
        <Stat label="Total Headcount" value={totalHead} />
        <Stat label="Currencies" value={new Set(offices.map((o) => o.currency)).size} />
      </div>

      <div className={s.matchGrid}>
        {offices.map((o) => (
          <motion.div key={o.id} className={s.matchCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={s.matchTop}>
              <span className={s.matchCat}>{o.is_hq ? "🏛️ " : "🌍 "}{o.country}</span>
              {o.is_hq ? <span className={s.matchTagWarn}>HQ</span> : (
                <button className={s.iconStar} onClick={() => remove(o.id)} title="Remove"><Trash2 size={16} color="#dc3545" /></button>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{o.city}</div>
            <div className={s.matchStats}>
              <div><strong>{o.headcount}</strong> staff</div>
              <div><strong>{o.budget_per_employee.toLocaleString()}</strong> {o.currency}/mo</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>FX: 1 {o.currency} = {o.fx_to_all} ALL</div>
          </motion.div>
        ))}
      </div>

      <form className={s.formCard} onSubmit={add} style={{ maxWidth: 720 }}>
        <h4 className={s.formTitle}>Add Country Office</h4>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Country"><input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="City"><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Currency"><input className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
          <Field label="1 unit = ? ALL"><input type="number" step="0.01" className="input" placeholder="e.g. 101" value={form.fx_to_all} onChange={(e) => setForm({ ...form, fx_to_all: e.target.value })} /></Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Headcount"><input type="number" className="input" value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} /></Field>
          <Field label="Budget / employee /mo"><input type="number" className="input" value={form.budget_per_employee} onChange={(e) => setForm({ ...form, budget_per_employee: e.target.value })} /></Field>
        </div>
        <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 8 }}><Plus size={14} style={{ verticalAlign: "-2px" }} /> Add Office</ShimmerButton>
      </form>
    </motion.div>
  );
}

/* ── Calendar: provider meetings ── */
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const iso = (d) => d.toISOString().slice(0, 10);

function Calendar({ onToast, itemVariants }) {
  const [meetings, setMeetings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState(iso(new Date()));
  const [showForm, setShowForm] = useState(false);

  const load = () => api.meetings().then(setMeetings);
  useEffect(() => {
    load();
    // Provider dropdown = active partnered providers (already in the Perx app).
    api.partnerships().then((all) => setProviders(all.filter((p) => p.partnered)));
  }, []);

  // Build the month grid (weeks starting Monday).
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startDow = (first.getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startDow; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(cursor.y, cursor.m, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map = {};
    for (const m of meetings) (map[m.date] = map[m.date] || []).push(m);
    return map;
  }, [meetings]);

  const dayMeetings = byDate[selected] || [];
  const shift = (delta) => setCursor((c) => {
    const m = c.m + delta;
    return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
  });
  const del = async (id) => { await api.deleteMeeting(id); onToast("Meeting removed"); load(); };

  return (
    <motion.div variants={itemVariants} className={s.calLayout}>
      {/* Month grid */}
      <div className="card" style={{ padding: 20 }}>
        <div className={s.calHeader}>
          <h4 className={s.cardTitle}><CalendarDays size={16} /> {MONTH_NAMES[cursor.m]} {cursor.y}</h4>
          <div style={{ display: "flex", gap: 6 }}>
            <button className={s.calNav} onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
            <button className={s.calNav} onClick={() => shift(1)}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className={s.calGrid}>
          {DOW.map((d) => <div key={d} className={s.calDow}>{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = iso(d);
            const has = byDate[k]?.length;
            const isSel = k === selected;
            const isToday = k === iso(new Date());
            return (
              <button key={i} onClick={() => setSelected(k)}
                className={`${s.calCell} ${isSel ? s.calCellSel : ""} ${isToday ? s.calCellToday : ""}`}>
                <span>{d.getDate()}</span>
                {has ? <span className={s.calDot}>{has > 1 ? has : ""}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail + add */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className={s.tableHeaderActions}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--dark)" }}>{selected}</h3>
          <button className={s.exportBtn} style={{ background: "var(--accent)" }} onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Meeting
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {dayMeetings.map((m) => (
            <div key={m.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 700, color: "var(--dark)", fontSize: 15 }}>{m.title}</div>
                <button className={s.iconStar} onClick={() => del(m.id)} title="Remove"><Trash2 size={15} color="#dc3545" /></button>
              </div>
              {m.provider && <span className={s.matchTagWarn} style={{ alignSelf: "flex-start" }}>{m.provider_emoji} {m.provider}</span>}
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                {m.time && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={13} /> {m.time}</span>}
                {m.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={13} /> {m.location}</span>}
              </div>
              {m.notes && <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{m.notes}</div>}
            </div>
          ))}
          {dayMeetings.length === 0 && <Empty msg="No meetings this day." />}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <MeetingForm date={selected} providers={providers}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); load(); onToast("Meeting scheduled"); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MeetingForm({ date, providers, onClose, onSaved }) {
  const [f, setF] = useState({ title: "", provider_id: "", date, time: "", location: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    if (!f.title || !f.date) return;
    setSaving(true);
    try {
      await api.createMeeting({ ...f, provider_id: f.provider_id ? Number(f.provider_id) : null });
      onSaved();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };
  return (
    <>
      <motion.div className={s.panelOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className={s.detailPanel} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}>
        <div className={s.panelHeader}>
          <h2 className={s.panelTitle}>New Meeting</h2>
          <button className={s.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Title"><input className="input" placeholder="e.g. Q3 package review" value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Service Provider (active in Perx)">
            <select className="input" value={f.provider_id} onChange={(e) => set("provider_id", e.target.value)}>
              <option value="">No specific provider</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.company_name}</option>)}
            </select>
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Date"><input type="date" className="input" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
            <Field label="Time"><input type="time" className="input" value={f.time} onChange={(e) => set("time", e.target.value)} /></Field>
          </div>
          <Field label="Location"><input className="input" placeholder="HQ, video call, provider site…" value={f.location} onChange={(e) => set("location", e.target.value)} /></Field>
          <Field label="Notes"><textarea className="input" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
          <ShimmerButton type="submit" disabled={saving} style={{ marginTop: 4 }}>{saving ? "Saving…" : "Schedule Meeting →"}</ShimmerButton>
        </form>
      </motion.div>
    </>
  );
}

const tipStyle = { background: "#fff", border: "1px solid var(--border)", borderRadius: "8px" };
