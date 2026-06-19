import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Store } from "lucide-react";
import { motion, ShimmerButton } from "../components/ui.jsx";
import { session } from "../lib/api.js";

const ROLES = [
  { value: "employer", title: "Employer", desc: "Approve & manage budgets", icon: Building2, route: "/employer" },
  { value: "hr", title: "HR", desc: "Insights, compliance, nudges", icon: Users, route: "/hr" },
  { value: "provider", title: "Provider", desc: "List offers & track payments", icon: Store, route: "/provider" },
];

const DEFAULT_NAME = { employer: "Manager", hr: "Elira", provider: "Zen Spa" };

export default function Login() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [role, setRole] = useState("employer");

  function enter() {
    const r = ROLES.find((x) => x.value === role);
    session.set({ name: name.trim() || DEFAULT_NAME[role], role });
    nav(r.route);
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <motion.div className="card" style={{ width: "100%", maxWidth: 460, padding: 32 }}
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <h1 style={{ color: "var(--text)", fontSize: 28, marginBottom: 4 }}>Welcome to Perx</h1>
        <p className="muted" style={{ marginBottom: 24 }}>Pick a role to explore the demo.</p>

        <input className="input" placeholder="Your name" value={name}
          onChange={(e) => setName(e.target.value)} style={{ marginBottom: 20 }} />

        <div className="grid-2" style={{ marginBottom: 24 }}>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const on = role === r.value;
            return (
              <motion.button key={r.value} whileTap={{ scale: 0.97 }} onClick={() => setRole(r.value)}
                style={{
                  textAlign: "left", padding: 16, borderRadius: 16,
                  border: `2px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  background: on ? "rgba(193,217,222,.5)" : "#fff",
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                <Icon color={on ? "var(--accent)" : "var(--text-secondary)"} />
                <span style={{ fontWeight: 700, color: "var(--text)" }}>{r.title}</span>
                <span className="muted" style={{ fontSize: 12 }}>{r.desc}</span>
              </motion.button>
            );
          })}
        </div>

        <ShimmerButton style={{ width: "100%" }} onClick={enter}>Enter Perx →</ShimmerButton>
      </motion.div>
    </div>
  );
}
