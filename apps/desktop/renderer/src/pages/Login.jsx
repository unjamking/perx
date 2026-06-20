import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { motion, ShimmerButton } from "../components/ui.jsx";
import { api, session, roleRoute } from "../lib/api.js";

const DEMO = [
  { label: "Employer", email: "manager@techtirana.al" },
  { label: "HR", email: "elira@techtirana.al" },
  { label: "Provider", email: "owner@zenspatirana.al" },
];

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e?.preventDefault();
    setErr("");
    if (!email || !password) { setErr("Please enter your email and password."); return; }
    setBusy(true);
    try {
      const res = await api.login({ email, password });
      if (res.error) { setErr(res.error); return; }
      session.set({ token: res.token, user: res.user });
      nav(res.user.must_change_password ? "/change-password" : (roleRoute[res.user.role] || "/employer"));
    } catch {
      setErr("Could not reach the server. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  const fillDemo = (em) => { setEmail(em); setPassword("perx1234"); setErr(""); };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <motion.div className="card" style={{ width: "100%", maxWidth: 440, padding: 32 }}
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: "var(--accent)", marginBottom: 2 }}>Perx</div>
        <h1 style={{ color: "var(--text)", fontSize: 22, marginBottom: 4 }}>Welcome back</h1>
        <p className="muted" style={{ marginBottom: 22 }}>Sign in to your dashboard.</p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <InputRow icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} />
          <InputRow icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} />
          {err && <div style={{ color: "#b3261e", fontSize: 13, fontWeight: 600 }}>{err}</div>}
          <ShimmerButton style={{ width: "100%" }} disabled={busy}>
            {busy ? "Signing in…" : "Sign In →"}
          </ShimmerButton>
        </form>

        <p className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: "center" }}>
          Accounts are created by your HR team. Contact HR if you need access.
        </p>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Try a demo account (password: perx1234)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DEMO.map((d) => (
              <button key={d.email} onClick={() => fillDemo(d.email)}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", cursor: "pointer",
                  border: "1px solid var(--border)", borderRadius: 99, padding: "6px 12px", background: "#fff" }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function InputRow({ icon: Icon, type = "text", placeholder, value, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <Icon size={17} color="var(--text-secondary)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
      <input className="input" type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} style={{ paddingLeft: 42 }} />
    </div>
  );
}
