import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { session } from "../lib/api.js";

// Sidebar footer: shows logged-in user + a logout button. Reused by all dashboards.
export default function Logout({ subtitle }) {
  const nav = useNavigate();
  const user = session.user();
  const out = () => { session.clear(); nav("/", { replace: true }); };
  return (
    <div style={{ padding: "16px 28px 0", flexShrink: 0 }}>
      <div style={{ color: "var(--text-on-dark)", fontWeight: 600, fontSize: 13, opacity: 0.85 }}>
        {user?.name || "Account"}
      </div>
      {subtitle && <div style={{ color: "var(--text-on-dark)", fontSize: 11, opacity: 0.5 }}>{subtitle}</div>}
      <button onClick={out}
        style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, color: "var(--text-on-dark)",
          background: "rgba(193,217,222,0.1)", border: "none", borderRadius: 8, padding: "8px 12px",
          fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }}>
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
}
