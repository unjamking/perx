const styles = {
  pending:  { background: "#C1D9DE", color: "#297376" },
  approved: { background: "#d6ece9", color: "#215E68" },
  rejected: { background: "#f7dada", color: "#b3261e" },
  paid:     { background: "#215E68", color: "#fff" },
  Active:   { background: "#d6ece9", color: "#215E68" },
  Maxed:    { background: "#f7dada", color: "#b3261e" },
};

export default function StatusBadge({ status }) {
  const s = styles[status] || styles.pending;
  return (
    <span style={{ ...s, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 700,
      textTransform: "capitalize", display: "inline-block" }}>
      {status}
    </span>
  );
}
