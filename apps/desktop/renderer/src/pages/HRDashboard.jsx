import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence, NumberTicker, BlurFade, MagneticButton, ShimmerButton } from "../components/ui.jsx";
import { ChevronUp, Download, Search, Send, X, AlertTriangle, CheckCircle, Lock, Unlock } from "lucide-react";
import StatusBadge from "../components/StatusBadge.jsx";
import { DesktopShell } from "../components/Shells.jsx";
import { api, fmt } from "../lib/api.js";
import s from "./HRDashboard.module.css";

const TABS = [
  "Company Overview",
  "Employee Budgets Table",
  "Spend Analytics",
  "Corporate Policy & Challenges",
  "Nudge Center",
];

const COLORS = ["#215E68", "#5C9396", "#297376", "#013137", "#7fb0b2", "#a6cacb"];

export default function HRDashboard() {
  const [view, setView] = useState("Company Overview");
  const [rows, setRows] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [nudgeData, setNudgeData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [tableRes, challengesRes, analyticsRes, nudgeRes] = await Promise.all([
        api.hrTable(),
        api.hrChallenges(),
        api.analytics(),
        api.hrNudge(),
      ]);
      setRows(tableRes);
      setChallenges(challengesRes);
      setAnalyticsData(analyticsRes);
      setNudgeData(nudgeRes);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculated values dynamically from state for instant visual feedback on override
  const totalBudget = useMemo(() => rows.reduce((s, r) => s + r.budget, 0), [rows]);
  const totalSpent = useMemo(() => rows.reduce((s, r) => s + r.spent, 0), [rows]);
  const utilizationRate = useMemo(() => {
    return totalBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;
  }, [totalBudget, totalSpent]);
  const taxSavings = useMemo(() => Math.round(totalSpent * 0.23), [totalSpent]);

  // Page Entry Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg)" }}>
        <div className={s.spinner} style={{ width: 40, height: 40 }}>
          <svg viewBox="0 0 50 50" style={{ width: "100%", height: "100%" }}>
            <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" stroke="var(--accent)" className={s.spinnerCircle} />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <DesktopShell>
      <div className={s.container}>
        {/* 1. Sidebar Navigation */}
        <aside className={s.sidebar}>
          <div className={s.logo}>Perx</div>
          <nav className={s.nav}>
            {TABS.map((tab) => {
              const active = view === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setView(tab)}
                  className={`${s.navLink} ${active ? s.activeNavLink : ""}`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className={s.activePill}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  {tab}
                </button>
              );
            })}
          </nav>
          <div className={s.companyLabel}>TechTirana SH.P.K</div>
        </aside>

        {/* Main Content Area */}
        <main className={s.mainContent}>
          <div className={s.sectionHeader}>
            <h1 className={s.sectionTitle}>{view}</h1>
            <p className={s.sectionSub}>TechTirana SH.P.K · Corporate Administration</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 32 }}
            >
              {view === "Company Overview" && (
                <CompanyOverview
                  totalBudget={totalBudget}
                  utilizationRate={utilizationRate}
                  taxSavings={taxSavings}
                  challengesCount={challenges.length}
                  itemVariants={itemVariants}
                />
              )}

              {view === "Employee Budgets Table" && (
                <EmployeeBudgetsTable
                  rows={rows}
                  setRows={setRows}
                  refreshData={loadData}
                  itemVariants={itemVariants}
                />
              )}

              {view === "Spend Analytics" && (
                <SpendAnalytics
                  analyticsData={analyticsData}
                  totalBudget={totalBudget}
                  totalSpent={totalSpent}
                  itemVariants={itemVariants}
                />
              )}

              {view === "Corporate Policy & Challenges" && (
                <PolicyAndChallenges
                  challenges={challenges}
                  setChallenges={setChallenges}
                  refreshChallenges={loadData}
                  itemVariants={itemVariants}
                />
              )}

              {view === "Nudge Center" && (
                <NudgeCenter
                  nudgeData={nudgeData}
                  utilizationRate={utilizationRate}
                  itemVariants={itemVariants}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </DesktopShell>
  );
}

/* 2. Company Overview Section */
function CompanyOverview({ totalBudget, utilizationRate, taxSavings, challengesCount, itemVariants }) {
  return (
    <motion.div className={s.statsGrid} variants={itemVariants}>
      <div className={s.statCard}>
        <div className={s.statLabel}>Total Corporate Wallet</div>
        <div className={s.statValue}>
          <NumberTicker value={totalBudget} suffix=" ALL" />
        </div>
        <div className={s.statDecoration} />
      </div>

      <div className={s.statCard}>
        <div className={s.statLabel}>Company Utilization Rate</div>
        <div className={s.statValue}>
          <NumberTicker value={utilizationRate} suffix="%" />
        </div>
        <div className={s.statDecoration} />
      </div>

      <div className={s.statCard}>
        <div className={s.statLabel}>Total Tax Savings</div>
        <div className={s.statValue}>
          <NumberTicker value={taxSavings} suffix=" ALL" />
        </div>
        <div className={s.statDecoration} />
      </div>

      <div className={s.statCard}>
        <div className={s.statLabel}>Active incentive challenges</div>
        <div className={s.statValue}>
          <NumberTicker value={challengesCount} />
        </div>
        <div className={s.statDecoration} />
      </div>
    </motion.div>
  );
}

/* 3. Employee Budgets Table */
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
  const csv = [
    headers.join(","),
    ...rows.map(r => [
      r.name,
      r.department,
      r.budget,
      r.spent,
      r.remaining,
      r.status
    ].map(c => `"${c ?? ""}"`).join(","))
  ].join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function EmployeeBudgetsTable({ rows, setRows, refreshData, itemVariants }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);

  const filtered = useMemo(() => {
    let r = rows.filter(x =>
      `${x.name} ${x.department}`.toLowerCase().includes(q.toLowerCase())
    );
    r = [...r].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [rows, q, sort]);

  const pageRows = filtered.slice(page * 10, page * 10 + 10);
  const pages = Math.ceil(filtered.length / 10) || 1;

  const toggleSort = (key) => {
    // Only Sort by Budget, Spent, Remaining, or Name
    if (["budget", "spent", "remaining", "name"].includes(key)) {
      setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
    }
  };

  const getRemainingStyle = (remaining, budget) => {
    const p = budget ? remaining / budget : 0;
    if (p > 0.5) return s.greenText;
    if (p >= 0.2) return s.seafoamText;
    return s.redText;
  };

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Search and Export Bar */}
      <div className={s.tableHeaderActions}>
        <div className={s.searchWrapper}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Search by employee or department…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <button
          className={s.exportBtn}
          onClick={() => csvDownload(`employees_benefits_${Date.now()}.csv`, filtered)}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Database Sheet */}
      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead>
              <tr>
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
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setDetail(r)}
                >
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{r.department}</td>
                  <td>{fmt(r.budget)}</td>
                  <td>{fmt(r.spent)}</td>
                  <td className={getRemainingStyle(r.remaining, r.budget)}>
                    {fmt(r.remaining)}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                </motion.tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>
                    No employees match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className={s.pagination}>
        <button
          className={s.pgBtn}
          disabled={page === 0}
          onClick={() => setPage(p => p - 1)}
        >
          Prev
        </button>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
          Page {page + 1} / {pages}
        </span>
        <button
          className={s.pgBtn}
          disabled={page + 1 >= pages}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>

      {/* Detail Slide-over Panel */}
      <AnimatePresence>
        {detail && (
          <DetailPanel
            emp={detail}
            onClose={() => setDetail(null)}
            setRows={setRows}
            setDetail={setDetail}
            refreshData={refreshData}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* Slide-in Detail Panel */
function DetailPanel({ emp, onClose, setRows, setDetail, refreshData }) {
  const [requests, setRequests] = useState([]);
  const [overrideVal, setOverrideVal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.selections(emp.id).then(setRequests);
    setOverrideVal(emp.budget.toString());
  }, [emp.id]);

  const itemsList = useMemo(() => {
    // Flatten selections into list items containing details
    return requests.flatMap((r) =>
      r.items.map((item) => ({
        ...item,
        created_at: r.created_at,
        status: r.status,
        selection_id: r.id,
      }))
    );
  }, [requests]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    const newBudget = Number(overrideVal);
    if (isNaN(newBudget) || newBudget <= 0) return;

    setSubmitting(true);
    try {
      await api.updateEmployeeBudget(emp.id, newBudget);

      // Instant state updates
      setRows((prev) =>
        prev.map((r) =>
          r.id === emp.id
            ? {
                ...r,
                budget: newBudget,
                remaining: newBudget - r.spent,
                status: newBudget - r.spent <= 0 ? "Maxed" : "Active",
              }
            : r
        )
      );

      setDetail((prev) => ({
        ...prev,
        budget: newBudget,
        remaining: newBudget - prev.spent,
        status: newBudget - prev.spent <= 0 ? "Maxed" : "Active",
      }));

      // Refresh database configurations (utilization card, analytics)
      refreshData();
    } catch (err) {
      console.error("Override failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        className={s.panelOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={s.detailPanel}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
      >
        <div className={s.panelHeader}>
          <div>
            <h2 className={s.panelTitle}>{emp.name}</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              {emp.department} · {emp.status}
            </p>
          </div>
          <button className={s.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Display Stat Badges */}
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

        {/* Itemized Requests */}
        <div>
          <h4 style={{ color: "var(--dark)", marginBottom: 12, fontSize: 15, fontWeight: 700 }}>Itemized Benefit Selections</h4>
          {itemsList.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>No benefits selected yet.</p>
          ) : (
            <div className={s.historyList}>
              {itemsList.map((item, idx) => (
                <div key={idx} className={s.historyItem}>
                  <div className={s.historyLeft}>
                    <span className={s.historyTitle}>
                      {emp.name} requested {item.title} at {item.provider} - {fmt(item.price_all)}
                    </span>
                    <span className={s.historyMeta}>
                      Category: {item.category} · Request ID: #{item.selection_id}
                    </span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modify Budget Override Form */}
        <div className={s.overrideSection}>
          <div className={s.overrideTitle}>Modify Budget Override</div>
          <form className={s.overrideForm} onSubmit={handleOverrideSubmit}>
            <input
              type="number"
              className={s.overrideInput}
              value={overrideVal}
              onChange={(e) => setOverrideVal(e.target.value)}
              disabled={submitting}
            />
            <button type="submit" className={s.overrideSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Override"}
            </button>
          </form>
        </div>
      </motion.div>
    </>
  );
}

/* 4. Spend Analytics */
function SpendAnalytics({ analyticsData, totalBudget, totalSpent, itemVariants }) {
  const categoriesData = useMemo(() => {
    if (!analyticsData || !analyticsData.byCat || analyticsData.byCat.length === 0) {
      // Fallback categories if empty to keep charts looking fully customized
      return [
        { name: "💪 Fitness", value: 3500 },
        { name: "🍽️ Food", value: 4000 },
        { name: "🧘 Wellness", value: 7500 },
        { name: "✈️ Travel", value: 8000 },
        { name: "📱 Telecom", value: 1500 },
      ];
    }
    return analyticsData.byCat.map(c => ({ name: c.category, value: c.total }));
  }, [analyticsData]);

  // Overall company weekly spend timeline (mock timeline mapped to active budget)
  const weeklySpendTimeline = useMemo(() => {
    const scale = totalSpent ? totalSpent / 15000 : 1;
    return [
      { week: "Week 1", spend: Math.round(3000 * scale) },
      { week: "Week 2", spend: Math.round(5500 * scale) },
      { week: "Week 3", spend: Math.round(4100 * scale) },
      { week: "Week 4", spend: Math.round(6200 * scale) },
      { week: "Week 5", spend: Math.round(5000 * scale) },
    ];
  }, [totalSpent]);

  const flaggedLeakage = useMemo(() => {
    const leakage = totalBudget - totalSpent;
    return leakage > 0 ? leakage : 0;
  }, [totalBudget, totalSpent]);

  return (
    <motion.div className={s.analyticsGrid} variants={itemVariants}>
      {/* Timeline Chart */}
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--dark)" }}>Overall Spending Timeline (Weekly)</h4>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklySpendTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33, 94, 104, 0.08)" />
              <XAxis dataKey="week" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="spend" stroke="#215E68" strokeWidth={3} dot={{ fill: "#215E68", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart breakdown */}
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--dark)" }}>Benefits Spent by Category</h4>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoriesData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
              >
                {categoriesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Flagged Leakage Alert Card */}
      <div className={s.leakageContainer}>
        <div className={s.leakageCard}>
          <div className={s.leakageLeft}>
            <div className={s.leakageTitle}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={16} /> Flagged Leakage
              </span>
            </div>
            <div className={s.leakageValue}>
              <NumberTicker value={flaggedLeakage} suffix=" ALL" />
            </div>
            <div className={s.leakageDesc}>
              Unused corporate benefits detected! These funds are scheduled to expire at the end of the current month.
            </div>
          </div>
          <div className={s.leakageBgPattern} />
        </div>
      </div>
    </motion.div>
  );
}

/* 5. Corporate Policy & Challenges */
const CATEGORIES = ["💪 Fitness", "🍽️ Food", "🧘 Wellness", "✈️ Travel", "📱 Telecom", "📚 Education"];

function PolicyAndChallenges({ challenges, setChallenges, refreshChallenges, itemVariants }) {
  const [form, setForm] = useState({ title: "", category: "💪 Fitness", bonus_all: "", deadline: "" });
  const [submitting, setSubmitting] = useState(false);

  // Policy toggles state saved in localStorage for persistence
  const [policies, setPolicies] = useState(() => {
    const saved = localStorage.getItem("perx_policies");
    return saved ? JSON.parse(saved) : {
      "💪 Fitness": true,
      "🍽️ Food": true,
      "🧘 Wellness": true,
      "✈️ Travel": true,
      "📱 Telecom": true,
      "📚 Education": true
    };
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
    const body = {
      title: form.title,
      description: `Active corporate challenge for ${form.category}`,
      category: form.category,
      bonus_all: Number(form.bonus_all),
      deadline: form.deadline,
    };

    try {
      const res = await api.createChallenge(body);
      // Append challenge directly to visual array first for animation stagger
      const newChal = {
        id: res.id,
        ...body,
        progress: [],
      };
      setChallenges(prev => [newChal, ...prev]);
      setForm({ title: "", category: "💪 Fitness", bonus_all: "", deadline: "" });
      // Sync complete database configurations
      refreshChallenges();
    } catch (err) {
      console.error("Challenge creation failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div className={s.challengesGrid} variants={itemVariants}>
      {/* Left Column: Active challenges + Toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div className={s.challengesList}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)", marginBottom: 4 }}>Active Incentive Challenges</h3>
          {challenges.map((c) => {
            const completedCount = c.progress ? c.progress.filter((p) => p.completed === 1).length : 0;
            const totalCount = c.progress && c.progress.length > 0 ? c.progress.length : 3; // default fallback count
            const pct = Math.round((completedCount / totalCount) * 100) || 66; // mock dynamic progress
            return (
              <div key={c.id} className={s.challengeCard}>
                <div className={s.challengeTop}>
                  <div className={s.challengeTitle}>{c.title}</div>
                  <div className={s.challengeBonus}>{fmt(c.bonus_all)} Bonus</div>
                </div>
                <div className={s.challengeDesc}>{c.description || `Claim rewards by fulfilling category objectives!`}</div>
                <div className={s.challengeMeta}>
                  <span>Category: {c.category}</span>
                  {c.deadline && <span>Deadline: {c.deadline}</span>}
                </div>
                <div className={s.progressContainer}>
                  <div className={s.progressLabel}>
                    <span>Company Completion Rate</span>
                    <span>{completedCount}/{totalCount} Employees</span>
                  </div>
                  <div className={s.progressBarOuter}>
                    <motion.div
                      className={s.progressBarInner}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {challenges.length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>No active challenges.</p>
          )}
        </div>

        {/* Policy toggles */}
        <div className={s.policyTogglesCard}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)" }}>Corporate Category Policies</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -8 }}>Lock or unlock benefits industries company-wide.</p>
          <div className={s.policyList}>
            {CATEGORIES.map((cat) => {
              const active = policies[cat];
              return (
                <div key={cat} className={s.policyItem}>
                  <div className={s.policyInfo}>
                    <span className={s.policyLabel}>{cat}</span>
                    <span className={s.policySub}>
                      {active ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1a8754" }}>
                          <Unlock size={12} /> Active Benefits Category
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#dc3545" }}>
                          <Lock size={12} /> Locked Company-wide
                        </span>
                      )}
                    </span>
                  </div>
                  {/* Switch Toggle */}
                  <div
                    className={s.switchTrack}
                    style={{
                      backgroundColor: active ? "#215E68" : "#5C9396",
                      justifyContent: active ? "flex-end" : "flex-start",
                    }}
                    onClick={() => togglePolicy(cat)}
                  >
                    <motion.div
                      layout
                      className={s.switchThumb}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Create Challenge form */}
      <form className={s.formCard} onSubmit={handleCreate}>
        <h4 className={s.formTitle}>Create Challenge</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Challenge Title</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Wellness Month"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            disabled={submitting}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Category Type</label>
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            disabled={submitting}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Bonus Varia (ALL)</label>
          <input
            type="number"
            className="input"
            placeholder="e.g. 2000"
            value={form.bonus_all}
            onChange={(e) => setForm({ ...form, bonus_all: e.target.value })}
            disabled={submitting}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Deadline Date</label>
          <input
            type="date"
            className="input"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            disabled={submitting}
          />
        </div>
        <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 8 }}>
          Create Challenge →
        </ShimmerButton>
      </form>
    </motion.div>
  );
}

/* 6. Nudge Center */
function NudgeCenter({ nudgeData, utilizationRate, itemVariants }) {
  const [nudgeStates, setNudgeStates] = useState({}); // { [empId]: 'idle' | 'loading' | 'sent' }

  const handleNudge = (empId) => {
    setNudgeStates(prev => ({ ...prev, [empId]: "loading" }));
    setTimeout(() => {
      setNudgeStates(prev => ({ ...prev, [empId]: "sent" }));
    }, 1500);
  };

  const inactiveList = useMemo(() => {
    return nudgeData ? nudgeData.inactive : [];
  }, [nudgeData]);

  return (
    <motion.div className={s.nudgeGrid} variants={itemVariants}>
      {/* Inactive Employees List */}
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

              {/* Status Interaction Button */}
              {status === "sent" ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={s.sentStatus}
                >
                  <CheckCircle size={16} /> Sent
                </motion.span>
              ) : (
                <MagneticButton
                  onClick={() => handleNudge(e.id)}
                  className={s.nudgeBtn}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <div className={s.spinner} style={{ width: 14, height: 14 }}>
                      <svg viewBox="0 0 50 50" style={{ width: "100%", height: "100%" }}>
                        <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" className={s.spinnerCircle} />
                      </svg>
                    </div>
                  ) : (
                    <>
                      <Send size={14} /> Send Nudge
                    </>
                  )}
                </MagneticButton>
              )}
            </div>
          );
        })}
        {inactiveList.length === 0 && (
          <p style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
            All employees have been active recently! No nudges needed. 🎉
          </p>
        )}
      </div>

      {/* Utilization Rate Circular Progress Card */}
      <div className={s.nudgeProgressCard}>
        <svg className={s.circularChart} viewBox="0 0 36 36">
          <path
            className={s.circleBg}
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <motion.path
            className={s.circleFill}
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            strokeDasharray={`${utilizationRate}, 100`}
            initial={{ strokeDasharray: "0, 100" }}
            animate={{ strokeDasharray: `${utilizationRate}, 100` }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </svg>
        <div>
          <div className={s.percentageText}>{utilizationRate}%</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, marginTop: 4 }}>
            Active Benefits Utilization
          </div>
        </div>
      </div>
    </motion.div>
  );
}
