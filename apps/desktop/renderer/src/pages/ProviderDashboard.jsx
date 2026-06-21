import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence, NumberTicker, ShimmerButton, MagneticButton } from "../components/ui.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Toast from "../components/Toast.jsx";
import { DesktopShell } from "../components/Shells.jsx";
import Logout from "../components/Logout.jsx";
import { api, fmt, DEMO, session } from "../lib/api.js";
import {
  LayoutGrid, Sparkles, Tag, Package, CalendarClock, BarChart3, Star, MessageSquare,
  Store, CreditCard, Plus, Trash2, X, Pencil, Send, Download, Image as ImageIcon,
} from "lucide-react";
import { printReport } from "../lib/report.js";
import s from "./HRDashboard.module.css";

// Categories for offers
const CATEGORIES = ["💪 Fitness", "🍽️ Food", "🧘 Wellness", "✈️ Travel", "📱 Telecom", "📚 Education"];

const NAV = [
  { group: "Overview", items: [
    { id: "Overview", icon: LayoutGrid },
    { id: "AI Optimization", icon: Sparkles },
    { id: "Analytics", icon: BarChart3 },
  ]},
  { group: "Catalog", items: [
    { id: "Offers", icon: Tag },
    { id: "Packages", icon: Package },
  ]},
  { group: "Sales", items: [
    { id: "Bookings", icon: CalendarClock },
    { id: "Revenue & Payouts", icon: CreditCard },
  ]},
  { group: "Brand", items: [
    { id: "Reviews", icon: Star },
    { id: "Company Profile", icon: Store },
  ]},
];

export default function ProviderDashboard() {
  const [view, setView] = useState("Overview");
  const [toast, setToast] = useState("");
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } } };
  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

  const user = session.user();
  const pid = user?.provider_id || DEMO.providerId;

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
          <div className={s.companyLabel}>Zen Spa Tirana · Provider</div>
          <Logout subtitle="Provider Console" />
        </aside>

        <main className={s.mainContent}>
          <div className={s.sectionHeader}>
            <h1 className={s.sectionTitle}>{view}</h1>
            <p className={s.sectionSub}>Zen Spa Tirana · Service Provider Console</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={view} variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {view === "Overview" && <Overview pid={pid} itemVariants={itemVariants} />}
              {view === "AI Optimization" && <AIOptimization pid={pid} itemVariants={itemVariants} />}
              {view === "Analytics" && <Analytics pid={pid} itemVariants={itemVariants} />}
              {view === "Offers" && <Offers pid={pid} onToast={flash} itemVariants={itemVariants} />}
              {view === "Packages" && <Packages pid={pid} onToast={flash} itemVariants={itemVariants} />}
              {view === "Bookings" && <Bookings pid={pid} itemVariants={itemVariants} />}
              {view === "Revenue & Payouts" && <Revenue pid={pid} itemVariants={itemVariants} />}
              {view === "Reviews" && <Reviews pid={pid} onToast={flash} itemVariants={itemVariants} />}
              {view === "Company Profile" && <Profile pid={pid} onToast={flash} itemVariants={itemVariants} />}
            </motion.div>
          </AnimatePresence>
        </main>
        <Toast message={toast} />
      </div>
    </DesktopShell>
  );
}

function Stat({ label, value, suffix, decimal }) {
  return (
    <div className={s.statCard}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>
        {/* NumberTicker rounds to int; render decimals (e.g. ratings) raw. */}
        {decimal ? `${value}${suffix || ""}` : <NumberTicker value={value} suffix={suffix} />}
      </div>
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
const tipStyle = { background: "#fff", border: "1px solid var(--border)", borderRadius: "8px" };

/* ── Overview ── */
function Overview({ pid: PID, itemVariants }) {
  const [rev, setRev] = useState(null);
  const [offers, setOffers] = useState([]);
  const [opt, setOpt] = useState(null);
  useEffect(() => {
    api.providerRevenue(PID).then(setRev);
    api.providerOffers(PID).then(setOffers);
    api.providerOptimize(PID).then(setOpt);
  }, []);
  const active = offers.filter((o) => o.is_active).length;
  return (
    <>
      <motion.div className={s.statsGrid} variants={itemVariants}>
        <Stat label="Net Payout (lifetime)" value={rev?.net ?? 0} suffix=" ALL" />
        <Stat label="Total Bookings" value={rev?.bookings ?? 0} />
        <Stat label="Active Offers" value={active} />
        <Stat label="Gross Revenue" value={rev?.gross ?? 0} suffix=" ALL" />
      </motion.div>
      <motion.div variants={itemVariants} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <h4 className={s.cardTitle}><Sparkles size={16} /> Top Optimization Tip</h4>
        {opt?.tips?.length ? (
          <div className={s.stratCard}>
            <span className={`${s.stratPriority} ${s.prioMed}`}>{opt.tips[0].type}</span>
            <div>
              <div className={s.stratTitle}>{opt.tips[0].offer}</div>
              <div className={s.stratDetail}>{opt.tips[0].text}</div>
            </div>
          </div>
        ) : <Empty msg="Catalog looks well-optimized." />}
      </motion.div>
    </>
  );
}

/* ── AI Optimization ── */
function AIOptimization({ pid: PID, itemVariants }) {
  const [opt, setOpt] = useState(null);
  useEffect(() => { api.providerOptimize(PID).then(setOpt); }, []);
  if (!opt) return null;
  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 640 }}>
        Suggestions generated from real redemption data{opt.median ? ` and the category median price (${opt.median.toLocaleString()} ALL)` : ""}.
      </p>
      {opt.tips.map((t, i) => (
        <motion.div key={i} className={s.stratCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <span className={`${s.stratPriority} ${s.prioMed}`}>{t.type}</span>
          <div>
            <div className={s.stratTitle}>{t.offer}</div>
            <div className={s.stratDetail}>{t.text}</div>
          </div>
        </motion.div>
      ))}
      {opt.tips.length === 0 && <Empty msg="No suggestions — catalog well-tuned." />}
    </motion.div>
  );
}

/* ── Analytics ── */
function Analytics({ pid: PID, itemVariants }) {
  const [data, setData] = useState([]);
  useEffect(() => { api.providerAnalytics(PID).then(setData); }, []);
  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h4 className={s.cardTitle}><BarChart3 size={16} /> Redemptions by Offer</h4>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,94,104,0.08)" />
              <XAxis dataKey="title" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="picks" fill="#215E68" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead><tr>{["Offer", "Redemptions", "Revenue", "Avg Rating", "Reviews"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.title} style={{ cursor: "default" }}>
                  <td style={{ fontWeight: 600 }}>{o.title}</td>
                  <td><strong style={{ color: "var(--accent)" }}>{o.picks}</strong></td>
                  <td>{fmt(o.revenue)}</td>
                  <td>{o.rating ? `★ ${o.rating}` : "—"}</td>
                  <td>{o.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Offers (CRUD + discount/deal/capacity/targeting) ── */
const blankOffer = { title: "", description: "", category: "🧘 Wellness", price_all: "", discount_pct: 0, capacity: 0, deal_ends: "", target_group: "" };

function Offers({ pid: PID, onToast, itemVariants }) {
  const [offers, setOffers] = useState([]);
  const [edit, setEdit] = useState(null); // offer object or "new"
  const load = () => api.providerOffers(PID).then(setOffers);
  useEffect(() => { load(); }, []);

  const toggle = async (o) => {
    setOffers((prev) => prev.map((x) => x.id === o.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x));
    await api.toggleOffer(o.id);
  };
  const remove = async (o) => { await api.deleteProviderOffer(o.id); onToast("Offer deleted"); load(); };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className={s.tableHeaderActions}>
        <div />
        <button className={s.exportBtn} style={{ background: "var(--accent)" }} onClick={() => setEdit("new")}>
          <Plus size={16} /> New Offer
        </button>
      </div>
      <div className={s.matchGrid}>
        {offers.map((o) => {
          const dealLive = o.deal_ends && o.deal_ends >= today;
          const final = o.discount_pct ? Math.round(o.price_all * (1 - o.discount_pct / 100)) : o.price_all;
          return (
            <motion.div key={o.id} className={s.matchCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ opacity: o.is_active ? 1 : 0.55 }}>
              <div className={s.matchTop}>
                <span className={s.matchCat}>{o.category.split(" ")[0]} {o.title}</span>
                {o.is_featured ? <span className={s.matchTagWarn}>Featured</span> : null}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{o.description || "No description"}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                {o.discount_pct ? (
                  <>
                    <span style={{ fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>{fmt(final)}</span>
                    <span style={{ textDecoration: "line-through", color: "var(--text-secondary)", fontSize: 13 }}>{fmt(o.price_all)}</span>
                    <span className={s.matchTagGap}>-{o.discount_pct}%</span>
                  </>
                ) : <span style={{ fontWeight: 800, fontSize: 18, color: "var(--accent)" }}>{fmt(o.price_all)}</span>}
              </div>
              <div className={s.matchStats}>
                <div><strong>{o.picks}</strong> redeemed</div>
                {o.capacity > 0 && <div><strong>{Math.max(0, o.capacity - o.picks)}</strong>/{o.capacity} left</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {dealLive && <span className={s.queryChip} style={{ color: "#dc3545" }}>⏰ Deal ends {o.deal_ends}</span>}
                {o.target_group && <span className={s.queryChip}>{o.target_group}</span>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                <button className={s.iconStar} onClick={() => setEdit(o)} title="Edit"><Pencil size={16} color="var(--accent)" /></button>
                <button className={s.iconStar} onClick={() => remove(o)} title="Delete"><Trash2 size={16} color="#dc3545" /></button>
                <div style={{ flex: 1 }} />
                <div className={s.switchTrack} style={{ backgroundColor: o.is_active ? "#215E68" : "#5C9396", justifyContent: o.is_active ? "flex-end" : "flex-start" }}
                  onClick={() => toggle(o)}>
                  <motion.div layout className={s.switchThumb} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                </div>
              </div>
            </motion.div>
          );
        })}
        {offers.length === 0 && <Empty msg="No offers yet. Create your first." />}
      </div>
      <AnimatePresence>
        {edit && <OfferEditor pid={PID} offer={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); onToast("Offer saved"); }} />}
      </AnimatePresence>
    </motion.div>
  );
}

function OfferEditor({ pid: PID, offer, onClose, onSaved }) {
  const [f, setF] = useState(offer ? {
    title: offer.title, description: offer.description || "", category: offer.category, price_all: offer.price_all,
    discount_pct: offer.discount_pct || 0, capacity: offer.capacity || 0, deal_ends: offer.deal_ends || "", target_group: offer.target_group || "",
    image_url: offer.image_url || "",
  } : { ...blankOffer, image_url: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  // Read picked file to a base64 data URL stored on the offer.
  const pickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image too large (max 5MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => set("image_url", reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!f.title || !f.price_all) return;
    setSaving(true);
    const body = {
      title: f.title, description: f.description, category: f.category, price_all: Number(f.price_all),
      discount_pct: Number(f.discount_pct) || 0, capacity: Number(f.capacity) || 0,
      deal_ends: f.deal_ends || null, target_group: f.target_group || null,
      image_url: f.image_url || null,
    };
    try {
      if (offer) await api.updateProviderOffer(offer.id, body);
      else await api.createProviderOffer({ provider_id: PID, ...body });
      onSaved();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div className={s.panelOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className={s.detailPanel} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}>
        <div className={s.panelHeader}>
          <h2 className={s.panelTitle}>{offer ? "Edit Offer" : "New Offer"}</h2>
          <button className={s.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Title"><input className="input" value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Description"><textarea className="input" rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Photo">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {f.image_url ? (
                <img src={f.image_url} alt="" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 96, height: 72, borderRadius: 10, border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: 12 }}>No photo</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className={s.iconStar} style={{ cursor: "pointer", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <ImageIcon size={16} color="var(--accent)" /> {f.image_url ? "Change" : "Upload"}
                  <input type="file" accept="image/*" onChange={pickImage} style={{ display: "none" }} />
                </label>
                {f.image_url ? <button type="button" onClick={() => set("image_url", "")} style={{ background: "none", border: "none", color: "#dc3545", fontSize: 12, cursor: "pointer", textAlign: "left" }}>Remove</button> : null}
              </div>
            </div>
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Category">
              <select className="input" value={f.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Price (ALL)"><input type="number" className="input" value={f.price_all} onChange={(e) => set("price_all", e.target.value)} /></Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Discount %"><input type="number" className="input" value={f.discount_pct} onChange={(e) => set("discount_pct", e.target.value)} /></Field>
            <Field label="Capacity (0 = unlimited)"><input type="number" className="input" value={f.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Limited Deal Ends"><input type="date" className="input" value={f.deal_ends} onChange={(e) => set("deal_ends", e.target.value)} /></Field>
            <Field label="Target Group">
              <select className="input" value={f.target_group} onChange={(e) => set("target_group", e.target.value)}>
                <option value="">All employees</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c} fans</option>)}
              </select>
            </Field>
          </div>
          <ShimmerButton type="submit" disabled={saving} style={{ marginTop: 4 }}>{saving ? "Saving…" : "Save Offer →"}</ShimmerButton>
        </form>
      </motion.div>
    </>
  );
}

/* ── Packages (bundles) ── */
function Packages({ pid: PID, onToast, itemVariants }) {
  const [pkgs, setPkgs] = useState([]);
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", offer_ids: [] });
  const [submitting, setSubmitting] = useState(false);
  const load = () => api.providerPackages(PID).then(setPkgs);
  useEffect(() => { load(); api.providerOffers(PID).then(setOffers); }, []);

  const toggleOffer = (id) => setForm((p) => ({ ...p, offer_ids: p.offer_ids.includes(id) ? p.offer_ids.filter((x) => x !== id) : [...p.offer_ids, id] }));
  const create = async (e) => {
    e.preventDefault();
    if (!form.title || form.offer_ids.length < 2) { onToast("Pick a title and 2+ offers"); return; }
    setSubmitting(true);
    try { await api.createProviderPackage({ provider_id: PID, ...form }); setForm({ title: "", description: "", offer_ids: [] }); load(); onToast("Bundle created"); }
    catch (err) { console.error(err); } finally { setSubmitting(false); }
  };
  const remove = async (id) => { await api.deleteProviderPackage(id); load(); onToast("Bundle deleted"); };

  return (
    <motion.div variants={itemVariants} className={s.challengesGrid}>
      <div className={s.challengesList}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--dark)", marginBottom: 4 }}>Bundled Packages</h3>
        {pkgs.map((p) => (
          <div key={p.id} className={s.challengeCard}>
            <div className={s.challengeTop}>
              <div className={s.challengeTitle}>{p.title}</div>
              <div className={s.challengeBonus}>{fmt(p.total_price_all)}</div>
            </div>
            <div className={s.challengeDesc}>{p.description}</div>
            <div className={s.challengeMeta}>{p.offers.map((o) => <span key={o.id}>{o.category.split(" ")[0]} {o.title}</span>)}</div>
            <button className={s.iconStar} style={{ alignSelf: "flex-start" }} onClick={() => remove(p.id)} title="Delete bundle"><Trash2 size={16} color="#dc3545" /></button>
          </div>
        ))}
        {pkgs.length === 0 && <Empty msg="No bundles yet." />}
      </div>
      <form className={s.formCard} onSubmit={create}>
        <h4 className={s.formTitle}>Create Bundle</h4>
        <Field label="Title"><input className="input" placeholder="e.g. Total Reset" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Description"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Include Offers (pick 2+)">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {offers.map((o) => (
              <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.offer_ids.includes(o.id)} onChange={() => toggleOffer(o.id)} />
                {o.title} <span style={{ color: "var(--text-secondary)" }}>· {fmt(o.price_all)}</span>
              </label>
            ))}
          </div>
        </Field>
        <ShimmerButton type="submit" disabled={submitting} style={{ marginTop: 8 }}>Create Bundle →</ShimmerButton>
      </form>
    </motion.div>
  );
}

/* ── Bookings / redemptions ── */
function Bookings({ pid: PID, itemVariants }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.providerBookings(PID).then(setRows); }, []);
  return (
    <motion.div variants={itemVariants} className={s.tableCard}>
      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead><tr>{["Date", "Offer", "Employee", "Amount", "Status"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>No bookings yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} style={{ cursor: "default" }}>
                <td style={{ color: "var(--text-secondary)" }}>{r.created_at?.slice(0, 10)}</td>
                <td style={{ fontWeight: 600 }}>{r.offer || "—"}</td>
                <td>{r.employee?.[0]}***</td>
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

/* ── Revenue & Payouts ── */
function Revenue({ pid: PID, itemVariants }) {
  const [rev, setRev] = useState(null);
  useEffect(() => { api.providerRevenue(PID).then(setRev); }, []);
  if (!rev) return null;
  const exportPdf = () => printReport({
    title: "Revenue & Payout Statement",
    subtitle: "Provider Statement · Perx",
    sections: [
      { heading: "Summary", stats: [
        { label: "Gross Revenue", value: fmt(rev.gross) },
        { label: "Platform Fee (8%)", value: fmt(rev.fee) },
        { label: "Net Payout", value: fmt(rev.net) },
        { label: "Bookings", value: rev.bookings },
      ]},
      { heading: "Monthly Revenue", table: {
        cols: ["Month", "Revenue"], rows: rev.series.map((m) => [m.month, fmt(m.revenue)]) } },
    ],
  });
  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={s.tableHeaderActions}>
        <div />
        <button className={s.exportBtn} onClick={exportPdf}><Download size={16} /> Export PDF</button>
      </div>
      <div className={s.statsGrid}>
        <Stat label="Gross Revenue" value={rev.gross} suffix=" ALL" />
        <Stat label="Platform Fee (8%)" value={rev.fee} suffix=" ALL" />
        <Stat label="Net Payout" value={rev.net} suffix=" ALL" />
        <Stat label="Bookings" value={rev.bookings} />
      </div>
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h4 className={s.cardTitle}><CreditCard size={16} /> Monthly Revenue</h4>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rev.series} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(33,94,104,0.08)" />
              <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tipStyle} />
              <Line type="monotone" dataKey="revenue" stroke="#215E68" strokeWidth={3} dot={{ fill: "#215E68", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Reviews + reply ── */
function Reviews({ pid: PID, onToast, itemVariants }) {
  const [reviews, setReviews] = useState([]);
  const [replyingId, setReplyingId] = useState(null);
  const [text, setText] = useState("");
  const load = () => api.providerReviews(PID).then(setReviews);
  useEffect(() => { load(); }, []);

  const avg = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const submitReply = async (id) => {
    if (!text.trim()) return;
    await api.replyReview(id, text);
    setReplyingId(null); setText(""); load(); onToast("Reply posted");
  };

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className={s.statsGrid} style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <Stat label="Average Rating" value={avg} suffix=" ★" decimal />
        <Stat label="Total Reviews" value={reviews.length} />
        <Stat label="Awaiting Reply" value={reviews.filter((r) => !r.reply).length} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {reviews.map((r) => (
          <div key={r.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, color: "var(--dark)" }}>{r.employee?.[0]}*** · {r.offer}</div>
              <div style={{ color: "#215E68", fontWeight: 700 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
            </div>
            <div style={{ fontSize: 14, color: "var(--text)" }}>{r.comment}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.created_at?.slice(0, 10)}</div>
            {r.reply ? (
              <div className={s.replyBox}><MessageSquare size={13} /> <span>{r.reply}</span></div>
            ) : replyingId === r.id ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input className={s.overrideInput} style={{ flex: 1 }} placeholder="Write a reply…" value={text} autoFocus
                  onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitReply(r.id)} />
                <button className={s.overrideSubmit} onClick={() => submitReply(r.id)}><Send size={14} /></button>
              </div>
            ) : (
              <button className={s.replyBtn} onClick={() => { setReplyingId(r.id); setText(""); }}>
                <MessageSquare size={14} /> Reply
              </button>
            )}
          </div>
        ))}
        {reviews.length === 0 && <Empty msg="No reviews yet." />}
      </div>
    </motion.div>
  );
}

/* ── Company Profile ── */
function Profile({ pid: PID, onToast, itemVariants }) {
  const [p, setP] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.providerProfile(PID).then(setP); }, []);
  if (!p) return null;
  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProviderProfile({ provider_id: PID, company_name: p.company_name, description: p.description, logo_emoji: p.logo_emoji, tagline: p.tagline, address: p.address, phone: p.phone });
      onToast("Profile saved");
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };
  return (
    <motion.div variants={itemVariants} className={s.challengesGrid}>
      <form className={s.formCard} onSubmit={save}>
        <h4 className={s.formTitle}>Company Profile</h4>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Logo Emoji"><input className="input" value={p.logo_emoji || ""} onChange={(e) => set("logo_emoji", e.target.value)} /></Field>
          <Field label="Company Name"><input className="input" value={p.company_name || ""} onChange={(e) => set("company_name", e.target.value)} /></Field>
        </div>
        <Field label="Tagline"><input className="input" value={p.tagline || ""} onChange={(e) => set("tagline", e.target.value)} /></Field>
        <Field label="Description"><textarea className="input" rows={3} value={p.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Address"><input className="input" value={p.address || ""} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="Phone"><input className="input" value={p.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <ShimmerButton type="submit" disabled={saving} style={{ marginTop: 8 }}>{saving ? "Saving…" : "Save Profile →"}</ShimmerButton>
      </form>
      <div className={s.brandPreview}>
        <div className={s.brandLogo} style={{ background: "rgba(33,94,104,0.1)" }}>{p.logo_emoji}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--dark)" }}>{p.company_name}</h2>
        <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>{p.tagline}</div>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{p.description}</p>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{p.address}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{p.phone}</div>
        <div className={s.matchTagWarn}>{p.category}</div>
      </div>
    </motion.div>
  );
}
