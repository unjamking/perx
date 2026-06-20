import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { motion, ShimmerButton } from "../components/ui.jsx";
import { api, session, roleRoute } from "../lib/api.js";

// Forced password change for HR-provisioned accounts on first login.
export default function ChangePassword() {
  const nav = useNavigate();
  const user = session.user();
  const forced = user?.must_change_password;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (next.length < 6) { setErr("New password must be at least 6 characters."); return; }
    if (next !== confirm) { setErr("Passwords don't match."); return; }
    setBusy(true);
    try {
      const res = await api.changePassword({ current: forced ? undefined : current, next });
      if (res.error) { setErr(res.error); return; }
      // Refresh session user (flag now cleared).
      const me = await api.me();
      if (me.user) session.set({ token: session.token(), user: me.user });
      nav(roleRoute[user.role] || "/");
    } catch {
      setErr("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <motion.div className="card" style={{ width: "100%", maxWidth: 420, padding: 32 }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ color: "var(--text)", fontSize: 22, marginBottom: 4 }}>
          {forced ? "Set a new password" : "Change password"}
        </h1>
        <p className="muted" style={{ marginBottom: 22 }}>
          {forced ? "Your account uses a temporary password. Choose a new one to continue." : "Update your account password."}
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!forced && <Row placeholder="Current password" value={current} onChange={setCurrent} />}
          <Row placeholder="New password" value={next} onChange={setNext} />
          <Row placeholder="Confirm new password" value={confirm} onChange={setConfirm} />
          {err && <div style={{ color: "#b3261e", fontSize: 13, fontWeight: 600 }}>{err}</div>}
          <ShimmerButton style={{ width: "100%" }} disabled={busy}>{busy ? "Saving…" : "Save Password →"}</ShimmerButton>
        </form>
      </motion.div>
    </div>
  );
}

function Row({ placeholder, value, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <Lock size={17} color="var(--text-secondary)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
      <input className="input" type="password" placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} style={{ paddingLeft: 42 }} />
    </div>
  );
}
