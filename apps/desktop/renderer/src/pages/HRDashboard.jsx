import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { motion, AnimatePresence, NumberTicker, MagneticButton, ShimmerButton } from "../components/ui.jsx";
import {
  ChevronUp, Download, Search, Send, X, AlertTriangle, CheckCircle, Lock, Unlock,
  Smile, TrendingUp, ShieldCheck, Store, Zap, Gift, Wallet, LayoutGrid, Bell,
  UserPlus, Copy, KeyRound, Check, ScrollText,
} from "lucide-react";
import StatusBadge from "../components/StatusBadge.jsx";
import { DesktopShell } from "../components/Shells.jsx";
import Logout from "../components/Logout.jsx";
import AuditLog from "../components/AuditLog.jsx";
import DashboardSkeleton from "../components/DashboardSkeleton.jsx";
import { printReport } from "../lib/report.js";
import { api, fmt } from "../lib/api.js";
import s from "./HRDashboard.module.css";

const COLORS = ["#215E68", "#5C9396", "#297376", "#013137", "#7fb0b2", "#a6cacb"];

// Grouped navigation — each entry maps to a view component.
const NAV = [
  { group: "Overview", items: [
    { id: "Company Overview", icon: LayoutGrid },
    { id: "Workforce Pulse", icon: Smile },
  ]},
  { group: "Budgets", items: [
    { id: "Employee Budgets", icon: Wallet },
    { id: "Budget Forecasting", icon: TrendingUp },
    { id: "Spend Analytics", icon: LayoutGrid },
  ]},
  { group: "Automation", items: [
    { id: "Auto-Approvals", icon: ShieldCheck },
    { id: "Provider Matching", icon: Store },
  ]},
  { group: "Engagement", items: [
    { id: "Challenges & Policy", icon: CheckCircle },
    { id: "Flash Drops", icon: Zap },
    { id: "Peer Gifting", icon: Gift },
    { id: "Nudge Center", icon: Bell },
  ]},
  { group: "Administration", items: [
    { id: "User Management", icon: UserPlus },
    { id: "Audit Log", icon: ScrollText },
  ]},
];

export default function HRDashboard() {
  const [view, setView] = useState("Company Overview");
  const [rows, setRows] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [nudgeData, setNudgeData] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [tableRes, challengesRes, analyticsRes, nudgeRes, forecastRes, sentimentRes] = await Promise.all([
        api.hrTable(), api.hrChallenges(), api.analytics(), api.hrNudge(), api.hrForecast(), api.hrSentiment(),
      ]);
      setRows(tableRes);
      setChallenges(challengesRes);
      setAnalyticsData(analyticsRes);
      setNudgeData(nudgeRes);
      setForecast(forecastRes);
      setSentiment(sentimentRes);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const totalBudget = useMemo(() => rows.reduce((a, r) => a + r.budget, 0), [rows]);
  const totalSpent = useMemo(() => rows.reduce((a, r) => a + r.spent, 0), [rows]);
  const utilizationRate = useMemo(() => (totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0), [totalBudget, totalSpent]);
  const taxSavings = useMemo(() => Math.round(totalSpent * 0.23), [totalSpent]);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } } };

  if (loading) {
    return <DesktopShell><DashboardSkeleton /></DesktopShell>;
  }

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
                      {active && (
                        <motion.div layoutId="sidebar-active-pill" className={s.activePill}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                      )}
                      <span className={s.navLinkInner}><Icon size={16} /> {id}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className={s.companyLabel}>TechTirana SH.P.K</div>
          <Logout subtitle="HR Console" />
        </aside>

        <main className={s.mainContent}>
          <div className={s.sectionHeader}>
            <h1 className={s.sectionTitle}>{view}</h1>
            <p className={s.sectionSub}>TechTirana SH.P.K · Corporate Administration</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={view} variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {view === "Company Overview" && (
                <CompanyOverview totalBudget={totalBudget} utilizationRate={utilizationRate}
                  taxSavings={taxSavings} challengesCount={challenges.length}
                  sentiment={sentiment} forecast={forecast} itemVariants={itemVariants} />
              )}
              {view === "Workforce Pulse" && <WorkforcePulse sentiment={sentiment} rows={rows} itemVariants={itemVariants} />}
              {view === "Employee Budgets" && (
                <EmployeeBudgets rows={rows} setRows={setRows} refreshData={loadData} itemVariants={itemVariants} />
              )}
              {view === "Budget Forecasting" && <BudgetForecasting forecast={forecast} itemVariants={itemVariants} />}
              {view === "Spend Analytics" && (
                <SpendAnalytics analyticsData={analyticsData} totalBudget={totalBudget} totalSpent={totalSpent} itemVariants={itemVariants} />
              )}
              {view === "Auto-Approvals" && <AutoApprovals itemVariants={itemVariants} />}
              {view === "Provider Matching" && <ProviderMatching itemVariants={itemVariants} />}
              {view === "Challenges & Policy" && (
                <PolicyAndChallenges challenges={challenges} setChallenges={setChallenges} refreshChallenges={loadData} itemVariants={itemVariants} />
              )}
              {view === "Flash Drops" && <FlashDrops itemVariants={itemVariants} />}
              {view === "Peer Gifting" && <PeerGifting itemVariants={itemVariants} />}
              {view === "Nudge Center" && <NudgeCenter nudgeData={nudgeData} utilizationRate={utilizationRate} itemVariants={itemVariants} />}
              {view === "User Management" && <UserManagement itemVariants={itemVariants} />}
              {view === "Audit Log" && <AuditLog source={api.hrAudit} itemVariants={itemVariants} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </DesktopShell>
  );
}

/* ── Company Overview ── */
function CompanyOverview({ totalBudget, utilizationRate, taxSavings, challengesCount, sentiment, forecast, itemVariants }) {
  return (
    <>
      <motion.div className={s.statsGrid} variants={itemVariants}>
        <Stat label="Total Corporate Wallet" value={totalBudget} suffix=" ALL" />
        <Stat label="Company Utilization Rate" value={utilizationRate} suffix="%" />
        <Stat label="Total Tax Savings" value={taxSavings} suffix=" ALL" />
        <Stat label="Active Incentive Challenges" value={challengesCount} />
      </motion.div>

      <motion.div variants={itemVariants} className={s.overviewSplit}>
        {/* Happiness Score */}
        <div className={s.scoreCard}>
          <div className={s.scoreLabel}><Smile size={16} /> Workforce Happiness Score</div>
          <ScoreGauge score={sentiment?.score ?? 0} />
          <div className={s.scoreHint}>Derived from live utilization, activity, perk variety & challenge participation.</div>
        </div>

        {/* Forecast snapshot */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 className={s.cardTitle}><TrendingUp size={16} /> Next-Month Spend Forecast</h4>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className={s.bigFigure}><NumberTicker value={forecast?.predicted ?? 0} suffix=" ALL" /></span>
            {forecast && (
              <span className={forecast.momChange >= 0 ? s.greenText : s.redText}>
                {forecast.momChange >= 0 ? "▲" : "▼"} {Math.abs(forecast.momChange)}% MoM
              </span>
            )}
          </div>
          <div style={{ width: "100%", height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast?.series ?? []} margin={{ top: 6, right: 6, left: -28, bottom: 0 }}>
                <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={tipStyle} />
                <Line type="monotone" dataKey="spend" stroke="#215E68" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </>
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

// Circular gauge for the 0-100 happiness score.
function ScoreGauge({ score }) {
  const color = score >= 70 ? "#1a8754" : score >= 45 ? "#5C9396" : "#dc3545";
  return (
    <div style={{ position: "relative", width: 160, height: 160 }}>
      <svg className={s.circularChart} viewBox="0 0 36 36" style={{ maxWidth: 160, maxHeight: 160 }}>
        <path className={s.circleBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        <motion.path className={s.circleFill} style={{ stroke: color }}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          initial={{ strokeDasharray: "0, 100" }} animate={{ strokeDasharray: `${score}, 100` }}
          transition={{ duration: 1.2, ease: "easeInOut" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 34, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

/* ── Workforce Pulse (Sentiment) ── */
function WorkforcePulse({ sentiment, rows, itemVariants }) {
  if (!sentiment) return null;
  const nameOf = (id) => rows.find((r) => r.id === id)?.name ?? `#${id}`;
  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={s.pulseHeader}>
        <div className={s.scoreCard} style={{ flex: "0 0 auto" }}>
          <div className={s.scoreLabel}><Smile size={16} /> Happiness Score</div>
          <ScoreGauge score={sentiment.score} />
        </div>
        <div className="card" style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <h4 className={s.cardTitle}>Score Drivers</h4>
          {sentiment.drivers.map((d) => (
            <div key={d.label}>
              <div className={s.progressLabel}>
                <span>{d.label} <span style={{ opacity: 0.6 }}>· {d.weight}% weight</span></span>
                <span>{d.value}</span>
              </div>
              <div className={s.progressBarOuter}>
                <motion.div className={s.progressBarInner} initial={{ width: 0 }} animate={{ width: `${d.value}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead><tr>
              <th>Employee</th><th>Budget Used</th><th>Perk Variety</th><th>Recently Active</th><th>In Challenges</th>
            </tr></thead>
            <tbody>
              {sentiment.breakdown.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{nameOf(b.id)}</td>
                  <td>{b.util}%</td>
                  <td>{b.variety} categories</td>
                  <td>{b.active ? <span className={s.greenText}>Active</span> : <span className={s.redText}>Idle</span>}</td>
                  <td>{b.participating ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Employee Budgets (table + bulk allocation) ── */
const COLS = [
  { key: "name", label: "Employee Name" },
  { key: "department", label: "Department" },
  { key: "budget", label: "Monthly Budget (ALL)" },
  { key: "spent", label: "Total Spent" },
  { key: "remaining", label: "Budget Remaining" },
  { key: "status", label: "Wallet Status" },
];

function csvDownload(filename, rows) {
  const headers = ["Employee Name", "Department", "Monthly Budget (ALL)", "Total Spent", "Budget Remaining", "Wallet Status"];
  const csv = [headers.join(","), ...rows.map((r) => [r.name, r.department, r.budget, r.spent, r.remaining, r.status].map((c) => `"${c ?? ""}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function EmployeeBudgets({ rows, setRows, refreshData, itemVariants }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);
  const [showAllocate, setShowAllocate] = useState(false);

  const filtered = useMemo(() => {
    let r = rows.filter((x) => `${x.name} ${x.department}`.toLowerCase().includes(q.toLowerCase()));
    r = [...r].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [rows, q, sort]);

  const pageRows = filtered.slice(page * 10, page * 10 + 10);
  const pages = Math.ceil(filtered.length / 10) || 1;
  const toggleSort = (key) => {
    if (["budget", "spent", "remaining", "name"].includes(key))
      setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  };
  const remStyle = (rem, budget) => {
    const p = budget ? rem / budget : 0;
    return p > 0.5 ? s.greenText : p >= 0.2 ? s.seafoamText : s.redText;
  };

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className={s.tableHeaderActions}>
        <div className={s.searchWrapper}>
          <Search size={16} className={s.searchIcon} />
          <input className={s.searchInput} placeholder="Search by employee or department…" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className={s.exportBtn} style={{ background: "var(--accent)" }} onClick={() => setShowAllocate(true)}>
            <Wallet size={16} /> Allocate Budget
          </button>
          <button className={s.exportBtn} onClick={() => csvDownload(`employees_benefits_${Date.now()}.csv`, filtered)}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead><tr>
              {COLS.map(({ key, label }) => {
                const isSortable = ["budget", "spent", "remaining", "name"].includes(key);
                return (
                  <th key={key} onClick={() => isSortable && toggleSort(key)}>
                    <div className={s.thContent}>
                      {label}
                      {isSortable && sort.key === key && (
                        <motion.span animate={{ rotate: sort.dir === "asc" ? 0 : 180 }} style={{ display: "inline-block" }}>
                          <ChevronUp size={14} />
                        </motion.span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr></thead>
            <tbody>
              {pageRows.map((r, i) => (
                <motion.tr key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }} onClick={() => setDetail(r)}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{r.department}</td>
                  <td>{fmt(r.budget)}</td>
                  <td>{fmt(r.spent)}</td>
                  <td className={remStyle(r.remaining, r.budget)}>{fmt(r.remaining)}</td>
                  <td><StatusBadge status={r.status} /></td>
                </motion.tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>
                  No employees match your search.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={s.pagination}>
        <button className={s.pgBtn} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Page {page + 1} / {pages}</span>
        <button className={s.pgBtn} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      <AnimatePresence>
        {detail && <DetailPanel emp={detail} onClose={() => setDetail(null)} setRows={setRows} setDetail={setDetail} refreshData={refreshData} />}
        {showAllocate && <AllocatePanel onClose={() => setShowAllocate(false)} refreshData={refreshData} />}
      </AnimatePresence>
    </motion.div>
  );
}

/* Bulk / department allocation panel */
function AllocatePanel({ onClose, refreshData }) {
  const [depts, setDepts] = useState([]);
  const [form, setForm] = useState({ department_id: "", amount: "", mode: "set" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => { api.departments().then(setDepts); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount) return;
    setSubmitting(true);
    try {
      const res = await api.allocateBudget({
        department_id: form.department_id ? Number(form.department_id) : undefined,
        amount: Number(form.amount), mode: form.mode,
      });
      setDone(res.affected);
      refreshData();
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  return (
    <>
      <motion.div className={s.panelOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className={s.detailPanel} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}>
        <div className={s.panelHeader}>
          <h2 className={s.panelTitle}>Allocate Budget</h2>
          <button className={s.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -12 }}>
          Assign monthly credits (ALL) to a whole department or the entire company at once.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Apply To">
            <select className="input" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">All Employees (Company-wide)</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Mode">
            <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="set">Set budget to</option>
              <option value="add">Add to current budget</option>
            </select>
          </Field>
          <Field label="Amount (ALL)">
            <input type="number" className="input" placeholder="e.g. 12000" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 4 }}>
            {submitting ? "Allocating…" : "Apply Allocation →"}
          </ShimmerButton>
          {done != null && <div className={s.successNote}><CheckCircle size={16} /> Updated {done} employee budget{done === 1 ? "" : "s"}.</div>}
        </form>
      </motion.div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

/* Detail slide-over (employee) */
function DetailPanel({ emp, onClose, setRows, setDetail, refreshData }) {
  const [requests, setRequests] = useState([]);
  const [overrideVal, setOverrideVal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.selections(emp.id).then(setRequests); setOverrideVal(emp.budget.toString()); }, [emp.id]);

  const itemsList = useMemo(() => requests.flatMap((r) =>
    r.items.map((item) => ({ ...item, created_at: r.created_at, status: r.status, selection_id: r.id }))), [requests]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    const newBudget = Number(overrideVal);
    if (isNaN(newBudget) || newBudget <= 0) return;
    setSubmitting(true);
    try {
      await api.updateEmployeeBudget(emp.id, newBudget);
      setRows((prev) => prev.map((r) => r.id === emp.id
        ? { ...r, budget: newBudget, remaining: newBudget - r.spent, status: newBudget - r.spent <= 0 ? "Maxed" : "Active" } : r));
      setDetail((prev) => ({ ...prev, budget: newBudget, remaining: newBudget - prev.spent, status: newBudget - prev.spent <= 0 ? "Maxed" : "Active" }));
      refreshData();
    } catch (err) { console.error("Override failed:", err); } finally { setSubmitting(false); }
  };

  return (
    <>
      <motion.div className={s.panelOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className={s.detailPanel} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}>
        <div className={s.panelHeader}>
          <div>
            <h2 className={s.panelTitle}>{emp.name}</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{emp.department} · {emp.status}</p>
          </div>
          <button className={s.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="card" style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase" }}>Allocated</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", marginTop: 2 }}>{fmt(emp.budget)}</div>
          </div>
          <div className="card" style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase" }}>Remaining</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", marginTop: 2 }}>{fmt(emp.remaining)}</div>
          </div>
        </div>
        <div>
          <h4 style={{ color: "var(--dark)", marginBottom: 12, fontSize: 15, fontWeight: 700 }}>Itemized Benefit Selections</h4>
          {itemsList.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>No benefits selected yet.</p>
          ) : (
            <div className={s.historyList}>
              {itemsList.map((item, idx) => (
                <div key={idx} className={s.historyItem}>
                  <div className={s.historyLeft}>
                    <span className={s.historyTitle}>{emp.name} requested {item.title} at {item.provider} - {fmt(item.price_all)}</span>
                    <span className={s.historyMeta}>Category: {item.category} · Request ID: #{item.selection_id}</span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={s.overrideSection}>
          <div className={s.overrideTitle}>Modify Budget Override</div>
          <form className={s.overrideForm} onSubmit={handleOverrideSubmit}>
            <input type="number" className={s.overrideInput} value={overrideVal}
              onChange={(e) => setOverrideVal(e.target.value)} disabled={submitting} />
            <button type="submit" className={s.overrideSubmit} disabled={submitting}>{submitting ? "Saving…" : "Override"}</button>
          </form>
        </div>
      </motion.div>
    </>
  );
}

/* ── Budget Forecasting ── */
function BudgetForecasting({ forecast, itemVariants }) {
  if (!forecast) return null;
  // Real series + the predicted next point appended (dashed).
  const chartData = useMemo(() => {
    const base = forecast.series.map((p) => ({ month: p.month, actual: p.spend }));
    return [...base, { month: "Next", predicted: forecast.predicted }];
  }, [forecast]);

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={s.statsGrid}>
        <Stat label="Predicted Next Month" value={forecast.predicted} suffix=" ALL" />
        <Stat label="Avg Monthly Spend" value={forecast.avg} suffix=" ALL" />
        <Stat label="Projected Unused Budget" value={forecast.projectedWaste} suffix=" ALL" />
        <Stat label="Month-over-Month" value={forecast.momChange} suffix="%" />
      </div>

      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h4 className={s.cardTitle}><TrendingUp size={16} /> Spend Trend & Forecast</h4>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,94,104,0.08)" />
              <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <ReferenceLine y={forecast.avg} stroke="#5C9396" strokeDasharray="4 4" label={{ value: "avg", fontSize: 11, fill: "#5C9396" }} />
              <Line type="monotone" dataKey="actual" stroke="#215E68" strokeWidth={3} dot={{ fill: "#215E68", r: 4 }} />
              <Line type="monotone" dataKey="predicted" stroke="#dc3545" strokeWidth={3} strokeDasharray="6 6" dot={{ fill: "#dc3545", r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={s.leakageCard}>
        <div className={s.leakageLeft}>
          <div className={s.leakageTitle}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={16} /> Waste Prevention</span></div>
          <div className={s.leakageValue}><NumberTicker value={forecast.projectedWaste} suffix=" ALL" /></div>
          <div className={s.leakageDesc}>
            Projected unspent budget next month based on the spending trend. Re-allocate or launch a flash drop to convert it to engagement before it expires.
          </div>
        </div>
        <div className={s.leakageBgPattern} />
      </div>
    </motion.div>
  );
}

/* ── Spend Analytics (real data only) ── */
function SpendAnalytics({ analyticsData, totalBudget, totalSpent, itemVariants }) {
  const categoriesData = useMemo(
    () => (analyticsData?.byCat ?? []).map((c) => ({ name: c.category, value: c.total })),
    [analyticsData]);
  const trend = analyticsData?.trend ?? [];
  const flaggedLeakage = Math.max(0, totalBudget - totalSpent);
  const hasCats = categoriesData.length > 0;

  const exportPdf = () => printReport({
    title: "Spend Analytics Report",
    subtitle: "TechTirana SH.P.K · Corporate Benefits",
    sections: [
      { heading: "Summary", stats: [
        { label: "Total Budget", value: fmt(totalBudget) },
        { label: "Total Spent", value: fmt(totalSpent) },
        { label: "Unused", value: fmt(flaggedLeakage) },
      ]},
      { heading: "Spend by Category", table: {
        cols: ["Category", "Total"], rows: categoriesData.map((c) => [c.name, fmt(c.value)]) } },
      { heading: "Monthly Timeline", table: {
        cols: ["Month", "Spend"], rows: trend.map((t) => [t.month, fmt(t.spend)]) } },
    ],
  });

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div className={s.tableHeaderActions}>
      <div />
      <button className={s.exportBtn} onClick={exportPdf}><Download size={16} /> Export PDF</button>
    </div>
    <div className={s.analyticsGrid}>
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h4 className={s.cardTitle}>Monthly Spending Timeline</h4>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33, 94, 104, 0.08)" />
              <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Line type="monotone" dataKey="spend" stroke="#215E68" strokeWidth={3} dot={{ fill: "#215E68", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h4 className={s.cardTitle}>Benefits Spent by Category</h4>
        <div style={{ width: "100%", height: 240, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {hasCats ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoriesData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={3}>
                  {categoriesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty msg="No approved spend yet." />}
        </div>
      </div>

      <div className={s.leakageContainer}>
        <div className={s.leakageCard}>
          <div className={s.leakageLeft}>
            <div className={s.leakageTitle}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={16} /> Flagged Leakage</span></div>
            <div className={s.leakageValue}><NumberTicker value={flaggedLeakage} suffix=" ALL" /></div>
            <div className={s.leakageDesc}>Unused corporate benefits detected. These funds are scheduled to expire at the end of the current month.</div>
          </div>
          <div className={s.leakageBgPattern} />
        </div>
      </div>
    </div>
    </motion.div>
  );
}

/* ── Auto-Approvals ── */
function AutoApprovals({ itemVariants }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ category: "📱 Telecom", max_amount: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.hrAutoRules().then(setRules);
  useEffect(() => { load(); }, []);

  const toggle = async (id) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: r.enabled ? 0 : 1 } : r));
    await api.toggleAutoRule(id);
  };
  const create = async (e) => {
    e.preventDefault();
    if (!form.max_amount) return;
    setSubmitting(true);
    try { await api.createAutoRule({ category: form.category, max_amount: Number(form.max_amount) }); setForm({ ...form, max_amount: "" }); load(); }
    catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  return (
    <motion.div className={s.challengesGrid} variants={itemVariants}>
      <div className={s.policyTogglesCard}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)" }}>Auto-Approval Guardrails</h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -8 }}>
          Low-risk requests in these categories under the cap are approved and paid out instantly — no manual review.
        </p>
        <div className={s.policyList}>
          {rules.map((r) => (
            <div key={r.id} className={s.policyItem}>
              <div className={s.policyInfo}>
                <span className={s.policyLabel}>{r.category}</span>
                <span className={s.policySub}>
                  {r.enabled
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1a8754" }}><Unlock size={12} /> Auto-approve up to {fmt(r.max_amount)}</span>
                    : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#dc3545" }}><Lock size={12} /> Manual review required</span>}
                </span>
              </div>
              <div className={s.switchTrack} style={{ backgroundColor: r.enabled ? "#215E68" : "#5C9396", justifyContent: r.enabled ? "flex-end" : "flex-start" }}
                onClick={() => toggle(r.id)}>
                <motion.div layout className={s.switchThumb} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
              </div>
            </div>
          ))}
          {rules.length === 0 && <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No rules yet.</p>}
        </div>
      </div>

      <form className={s.formCard} onSubmit={create}>
        <h4 className={s.formTitle}>Add Guardrail</h4>
        <Field label="Category">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Max Auto-Approve Amount (ALL)">
          <input type="number" className="input" placeholder="e.g. 3000" value={form.max_amount}
            onChange={(e) => setForm({ ...form, max_amount: e.target.value })} />
        </Field>
        <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 8 }}>Add Rule →</ShimmerButton>
      </form>
    </motion.div>
  );
}

/* ── Provider Matching ── */
function ProviderMatching({ itemVariants }) {
  const [gaps, setGaps] = useState([]);
  useEffect(() => { api.hrProviderMatches().then((d) => setGaps(d.gaps)); }, []);

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 640 }}>
        Recommended new Albanian vendors to onboard, ranked by real employee search demand the current catalog can't fully serve.
      </p>
      <div className={s.matchGrid}>
        {gaps.map((g) => (
          <motion.div key={g.category} className={s.matchCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={s.matchTop}>
              <span className={s.matchCat}>{g.category}</span>
              {g.covered
                ? <span className={s.matchTagWarn}>Underserved</span>
                : <span className={s.matchTagGap}>No provider</span>}
            </div>
            <div className={s.matchStats}>
              <div><strong>{g.searches}</strong> searches</div>
              <div><strong>{g.unmatched}</strong> unmatched</div>
            </div>
            <div className={s.matchQueries}>
              {g.queries.map((q) => <span key={q} className={s.queryChip}>“{q}”</span>)}
            </div>
            <MagneticButton className={s.nudgeBtn} style={{ width: "100%", marginTop: 4 }}>
              <Store size={14} /> Source Vendor
            </MagneticButton>
          </motion.div>
        ))}
        {gaps.length === 0 && <Empty msg="No unmet vendor demand. Catalog covers all searches. 🎉" />}
      </div>
    </motion.div>
  );
}

/* ── Challenges & Policy ── */
const CATEGORIES = ["💪 Fitness", "🍽️ Food", "🧘 Wellness", "✈️ Travel", "📱 Telecom", "📚 Education"];

function PolicyAndChallenges({ challenges, setChallenges, refreshChallenges, itemVariants }) {
  const [form, setForm] = useState({ title: "", category: "💪 Fitness", bonus_all: "", deadline: "" });
  const [submitting, setSubmitting] = useState(false);
  const [policies, setPolicies] = useState(() => {
    const saved = localStorage.getItem("perx_policies");
    return saved ? JSON.parse(saved) : Object.fromEntries(CATEGORIES.map((c) => [c, true]));
  });

  const togglePolicy = (cat) => {
    const updated = { ...policies, [cat]: !policies[cat] };
    setPolicies(updated);
    localStorage.setItem("perx_policies", JSON.stringify(updated));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.bonus_all) return;
    setSubmitting(true);
    const body = { title: form.title, description: `Active corporate challenge for ${form.category}`, category: form.category, bonus_all: Number(form.bonus_all), deadline: form.deadline };
    try {
      const res = await api.createChallenge(body);
      setChallenges((prev) => [{ id: res.id, ...body, progress: [] }, ...prev]);
      setForm({ title: "", category: "💪 Fitness", bonus_all: "", deadline: "" });
      refreshChallenges();
    } catch (err) { console.error("Challenge creation failed:", err); } finally { setSubmitting(false); }
  };

  return (
    <motion.div className={s.challengesGrid} variants={itemVariants}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className={s.challengesList}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)", marginBottom: 4 }}>Active Incentive Challenges</h3>
          {challenges.map((c) => {
            const total = c.progress?.length ?? 0;
            const completed = c.progress ? c.progress.filter((p) => p.completed === 1).length : 0;
            const pct = total ? Math.round((completed / total) * 100) : 0;
            return (
              <div key={c.id} className={s.challengeCard}>
                <div className={s.challengeTop}>
                  <div className={s.challengeTitle}>{c.title}</div>
                  <div className={s.challengeBonus}>{fmt(c.bonus_all)} Bonus</div>
                </div>
                <div className={s.challengeDesc}>{c.description || "Claim rewards by fulfilling category objectives!"}</div>
                <div className={s.challengeMeta}>
                  <span>Category: {c.category}</span>
                  {c.deadline && <span>Deadline: {c.deadline}</span>}
                </div>
                <div className={s.progressContainer}>
                  <div className={s.progressLabel}>
                    <span>Company Completion Rate</span>
                    <span>{completed}/{total} Employees</span>
                  </div>
                  <div className={s.progressBarOuter}>
                    <motion.div className={s.progressBarInner} initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }} />
                  </div>
                </div>
              </div>
            );
          })}
          {challenges.length === 0 && <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No active challenges.</p>}
        </div>

        <div className={s.policyTogglesCard}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)" }}>Corporate Category Policies</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -8 }}>Lock or unlock benefit categories company-wide.</p>
          <div className={s.policyList}>
            {CATEGORIES.map((cat) => {
              const active = policies[cat];
              return (
                <div key={cat} className={s.policyItem}>
                  <div className={s.policyInfo}>
                    <span className={s.policyLabel}>{cat}</span>
                    <span className={s.policySub}>
                      {active
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1a8754" }}><Unlock size={12} /> Active Benefits Category</span>
                        : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#dc3545" }}><Lock size={12} /> Locked Company-wide</span>}
                    </span>
                  </div>
                  <div className={s.switchTrack} style={{ backgroundColor: active ? "#215E68" : "#5C9396", justifyContent: active ? "flex-end" : "flex-start" }}
                    onClick={() => togglePolicy(cat)}>
                    <motion.div layout className={s.switchThumb} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <form className={s.formCard} onSubmit={handleCreate}>
        <h4 className={s.formTitle}>Create Challenge</h4>
        <Field label="Challenge Title">
          <input type="text" className="input" placeholder="e.g. Wellness Month" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={submitting} />
        </Field>
        <Field label="Category Type">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={submitting}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Bonus (ALL)">
          <input type="number" className="input" placeholder="e.g. 2000" value={form.bonus_all}
            onChange={(e) => setForm({ ...form, bonus_all: e.target.value })} disabled={submitting} />
        </Field>
        <Field label="Deadline Date">
          <input type="date" className="input" value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })} disabled={submitting} />
        </Field>
        <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 8 }}>Create Challenge →</ShimmerButton>
      </form>
    </motion.div>
  );
}

/* ── Flash Drops ── */
function FlashDrops({ itemVariants }) {
  const [drops, setDrops] = useState([]);
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", offer_id: "", bonus_all: "", starts_at: "", ends_at: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.hrFlashDrops().then(setDrops);
  useEffect(() => { load(); api.offers().then(setOffers); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const create = async (e) => {
    e.preventDefault();
    if (!form.title || !form.bonus_all) return;
    setSubmitting(true);
    try {
      await api.createFlashDrop({ ...form, offer_id: form.offer_id ? Number(form.offer_id) : null, bonus_all: Number(form.bonus_all) });
      setForm({ title: "", description: "", offer_id: "", bonus_all: "", starts_at: "", ends_at: "" });
      load();
    } catch (err) { console.error(err); } finally { setSubmitting(false); }
  };

  return (
    <motion.div className={s.challengesGrid} variants={itemVariants}>
      <div className={s.challengesList}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)", marginBottom: 4 }}>Scheduled Flash Drops</h3>
        {drops.map((d) => {
          const live = d.ends_at >= today && d.starts_at <= today;
          const expired = d.ends_at < today;
          return (
            <div key={d.id} className={s.challengeCard}>
              <div className={s.challengeTop}>
                <div className={s.challengeTitle}><Zap size={16} style={{ verticalAlign: "-2px", color: "#215E68" }} /> {d.title}</div>
                <div className={s.challengeBonus}>+{fmt(d.bonus_all)}</div>
              </div>
              <div className={s.challengeDesc}>{d.description}</div>
              <div className={s.challengeMeta}>
                {d.offer_title && <span>Perk: {d.offer_title}</span>}
                <span>{d.starts_at} → {d.ends_at}</span>
                <span className={live ? s.greenText : expired ? s.redText : s.seafoamText}>
                  {live ? "● Live now" : expired ? "Ended" : "Scheduled"}
                </span>
              </div>
            </div>
          );
        })}
        {drops.length === 0 && <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No flash drops scheduled.</p>}
      </div>

      <form className={s.formCard} onSubmit={create}>
        <h4 className={s.formTitle}>Schedule Flash Drop</h4>
        <Field label="Title"><input type="text" className="input" placeholder="e.g. Summer Spa Flash" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><input type="text" className="input" placeholder="Short pitch" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Linked Perk (optional)">
          <select className="input" value={form.offer_id} onChange={(e) => setForm({ ...form, offer_id: e.target.value })}>
            <option value="">Any perk</option>
            {offers.map((o) => <option key={o.id} value={o.id}>{o.title} · {o.provider}</option>)}
          </select>
        </Field>
        <Field label="Bonus Credit (ALL)"><input type="number" className="input" placeholder="e.g. 1500" value={form.bonus_all} onChange={(e) => setForm({ ...form, bonus_all: e.target.value })} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Starts"><input type="date" className="input" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
          <Field label="Ends"><input type="date" className="input" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
        </div>
        <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 8 }}>Schedule Drop →</ShimmerButton>
      </form>
    </motion.div>
  );
}

/* ── Peer Gifting ── */
function PeerGifting({ itemVariants }) {
  const [gifts, setGifts] = useState([]);
  useEffect(() => { api.hrGifts().then(setGifts); }, []);
  const total = gifts.reduce((a, g) => a + g.amount_all, 0);

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={s.statsGrid} style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <Stat label="Total Gifts Sent" value={gifts.length} />
        <Stat label="Credits Transferred" value={total} suffix=" ALL" />
        <Stat label="Avg Gift" value={gifts.length ? Math.round(total / gifts.length) : 0} suffix=" ALL" />
      </div>
      <div className={s.nudgeList}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)", marginBottom: 4 }}>Peer Gift Activity</h3>
        {gifts.map((g) => (
          <motion.div key={g.id} className={s.nudgeItem} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={s.nudgeDetails}>
              <span className={s.nudgeName}><Gift size={15} style={{ verticalAlign: "-2px", color: "#215E68" }} /> {g.from_name} → {g.to_name}</span>
              <span className={s.nudgeDays}>{g.note || "No message"} · {g.created_at?.slice(0, 10)}</span>
            </div>
            <span className={s.giftAmount}>{fmt(g.amount_all)}</span>
          </motion.div>
        ))}
        {gifts.length === 0 && <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No peer gifts yet.</p>}
      </div>
    </motion.div>
  );
}

/* ── Nudge Center ── */
function NudgeCenter({ nudgeData, utilizationRate, itemVariants }) {
  const [nudgeStates, setNudgeStates] = useState({});
  const handleNudge = (empId) => {
    setNudgeStates((prev) => ({ ...prev, [empId]: "loading" }));
    setTimeout(() => setNudgeStates((prev) => ({ ...prev, [empId]: "sent" })), 1500);
  };
  const inactiveList = nudgeData?.inactive ?? [];

  return (
    <motion.div className={s.nudgeGrid} variants={itemVariants}>
      <div className={s.nudgeList}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)", marginBottom: 4 }}>Inactive Employees (14+ Days)</h3>
        {inactiveList.map((e) => {
          const status = nudgeStates[e.id] || "idle";
          return (
            <div key={e.id} className={s.nudgeItem}>
              <div className={s.nudgeDetails}>
                <span className={s.nudgeName}>{e.name}</span>
                <span className={s.nudgeDays}>{e.days_inactive} days inactive</span>
              </div>
              {status === "sent" ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={s.sentStatus}>
                  <CheckCircle size={16} /> Sent
                </motion.span>
              ) : (
                <MagneticButton onClick={() => handleNudge(e.id)} className={s.nudgeBtn} disabled={status === "loading"}>
                  {status === "loading" ? (
                    <div className={s.spinner} style={{ width: 14, height: 14 }}>
                      <svg viewBox="0 0 50 50" style={{ width: "100%", height: "100%" }}>
                        <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" className={s.spinnerCircle} />
                      </svg>
                    </div>
                  ) : <><Send size={14} /> Send Nudge</>}
                </MagneticButton>
              )}
            </div>
          );
        })}
        {inactiveList.length === 0 && (
          <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>All employees active recently! No nudges needed. 🎉</p>
        )}
      </div>

      <div className={s.nudgeProgressCard}>
        <svg className={s.circularChart} viewBox="0 0 36 36">
          <path className={s.circleBg} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <motion.path className={s.circleFill} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            strokeDasharray={`${utilizationRate}, 100`} initial={{ strokeDasharray: "0, 100" }}
            animate={{ strokeDasharray: `${utilizationRate}, 100` }} transition={{ duration: 1.2, ease: "easeInOut" }} />
        </svg>
        <div>
          <div className={s.percentageText}>{utilizationRate}%</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, marginTop: 4 }}>Active Benefits Utilization</div>
        </div>
      </div>
    </motion.div>
  );
}

function Empty({ msg }) {
  return <p style={{ color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center", padding: 24 }}>{msg}</p>;
}

/* ── User Management (HR provisions accounts) ── */
const ROLE_LABEL = { employee: "Employee", employer: "Employer", hr: "HR", provider: "Provider" };

function UserManagement({ itemVariants }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", role: "employee", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null); // { email, tempPassword }
  const [error, setError] = useState("");

  const load = () => api.hrUsers().then((r) => setUsers(Array.isArray(r) ? r : []));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email) { setError("Name and email are required."); return; }
    setSubmitting(true);
    try {
      const res = await api.createHrUser(form);
      if (res.error) { setError(res.error); return; }
      setCreated({ email: res.user.email, tempPassword: res.tempPassword });
      setForm({ name: "", email: "", role: "employee", password: "" });
      load();
    } catch { setError("Could not create user."); }
    finally { setSubmitting(false); }
  };

  const reset = async (u) => {
    const res = await api.resetHrUser(u.id);
    if (res.tempPassword) setCreated({ email: u.email, tempPassword: res.tempPassword });
  };

  return (
    <motion.div className={s.challengesGrid} variants={itemVariants}>
      {/* User list */}
      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead><tr>{["Name", "Email", "Role", ""].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ cursor: "default" }}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{u.email}</td>
                  <td><span className={s.matchTagWarn}>{ROLE_LABEL[u.role] || u.role}</span></td>
                  <td>
                    <button className={s.replyBtn} style={{ padding: "6px 10px" }} onClick={() => reset(u)}>
                      <KeyRound size={13} /> Reset
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create form */}
      <form className={s.formCard} onSubmit={create}>
        <h4 className={s.formTitle}>Create User</h4>
        <Field label="Full Name">
          <input className="input" placeholder="e.g. Mira Hoxha" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" placeholder="name@techtirana.al" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Role">
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="employee">Employee</option>
            <option value="employer">Employer</option>
            <option value="hr">HR</option>
            <option value="provider">Provider</option>
          </select>
        </Field>
        <Field label="Temp Password (optional — auto-generated if blank)">
          <input className="input" placeholder="Leave blank to auto-generate" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <div style={{ color: "#b3261e", fontSize: 13, fontWeight: 600 }}>{error}</div>}
        <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 8 }}>
          <UserPlus size={14} style={{ verticalAlign: "-2px" }} /> Create User
        </ShimmerButton>

        {created && <CredentialCard email={created.email} pw={created.tempPassword} onClose={() => setCreated(null)} />}
      </form>
    </motion.div>
  );
}

// Shows generated credentials once with copy buttons — HR hands these to the user.
function CredentialCard({ email, pw, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(`Email: ${email}\nPassword: ${pw}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className={s.credCard}>
      <div className={s.credTitle}>✓ Account ready — share these credentials</div>
      <div className={s.credRow}><span>Email</span><code>{email}</code></div>
      <div className={s.credRow}><span>Password</span><code>{pw}</code></div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button type="button" className={s.credCopyBtn} onClick={copy}>
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
        <button type="button" className={s.credDismiss} onClick={onClose}>Dismiss</button>
      </div>
    </div>
  );
}

const tipStyle = { background: "#fff", border: "1px solid var(--border)", borderRadius: "8px" };
