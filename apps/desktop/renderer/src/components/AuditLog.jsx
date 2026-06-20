import { useState, useEffect } from "react";
import { motion } from "./ui.jsx";
import { ScrollText } from "lucide-react";
import s from "../pages/HRDashboard.module.css";

const ACTION_LABEL = {
  approve_selection: "Approved request",
  reject_selection: "Rejected request",
  update_budget: "Changed budget",
  allocate_budget: "Allocated budget",
  update_policy: "Updated policy",
};

// Shared audit trail view. `source` is an api fn returning the log array.
export default function AuditLog({ source, itemVariants }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { source().then((r) => setRows(Array.isArray(r) ? r : [])); }, []);

  return (
    <motion.div variants={itemVariants} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 640 }}>
        Every budget change, approval and policy update — who did what, when.
      </p>
      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead><tr>{["When", "Who", "Action", "Detail"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {rows === null && [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={4}><div className={s.skeletonRow} /></td></tr>
              ))}
              {rows?.map((r) => (
                <tr key={r.id} style={{ cursor: "default" }}>
                  <td style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{r.created_at?.slice(0, 16).replace("T", " ")}</td>
                  <td style={{ fontWeight: 600 }}>{r.actor_name} <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>· {r.actor_role}</span></td>
                  <td><span className={s.matchTagWarn}>{ACTION_LABEL[r.action] || r.action}</span></td>
                  <td style={{ color: "var(--text-secondary)" }}>{r.detail}</td>
                </tr>
              ))}
              {rows?.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>
                  <ScrollText size={20} style={{ verticalAlign: "-4px", marginRight: 6 }} /> No activity logged yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
