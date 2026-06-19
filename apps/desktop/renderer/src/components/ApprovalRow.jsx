import { motion } from "./ui.jsx";
import { Check } from "lucide-react";
import { ShimmerButton } from "./ui.jsx";
import { fmt } from "../lib/api.js";

export default function ApprovalRow({ sel, onApprove, onReject, done }) {
  const initial = (sel.employee_name || "?")[0].toUpperCase();
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }} className="card"
      style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--accent)", color: "#fff",
        display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>{initial}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{sel.employee_name}</div>
        <div className="muted" style={{ fontSize: 13 }}>{sel.items.map((i) => i.title).join(", ")}</div>
      </div>
      <div style={{ fontWeight: 800, color: "var(--accent)" }}>{fmt(sel.total_amount)}</div>
      {done ? (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)",
            display: "grid", placeItems: "center" }}>
          <Check color="#fff" />
        </motion.div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <ShimmerButton style={{ padding: "10px 18px" }} onClick={() => onApprove(sel.id)}>Approve</ShimmerButton>
          <button className="btn btn-outline" style={{ borderColor: "var(--hover)", color: "var(--hover)" }}
            onClick={() => onReject(sel.id)}>Reject</button>
        </div>
      )}
    </motion.div>
  );
}
