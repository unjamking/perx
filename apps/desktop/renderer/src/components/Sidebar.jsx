import { useNavigate } from "react-router-dom";
import { motion } from "./ui.jsx";

export default function Sidebar({ nav, active, onChange, company = "TechTirana SH.P.K" }) {
  const go = useNavigate();
  return (
    <aside style={{
      width: 240, background: "var(--dark)", padding: "28px 0", alignSelf: "stretch",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      <div onClick={() => go("/")} style={{ fontSize: 26, fontWeight: 800, color: "var(--surface)",
        padding: "0 24px 28px", cursor: "pointer" }}>Perx</div>
      <nav style={{ flex: 1 }}>
        {nav.map((item) => {
          const on = active === item;
          return (
            <button key={item} onClick={() => onChange(item)}
              style={{ position: "relative", display: "block", width: "100%", textAlign: "left",
                padding: "12px 24px", color: on ? "var(--text-on-dark)" : "rgba(193,217,222,.55)",
                fontWeight: on ? 700 : 500 }}>
              {on && <motion.div layoutId="sidebar-active"
                style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 4,
                  background: "var(--accent)", borderRadius: 99 }} />}
              {item}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "0 24px", color: "var(--hover)", fontSize: 13, fontWeight: 600 }}>{company}</div>
    </aside>
  );
}
