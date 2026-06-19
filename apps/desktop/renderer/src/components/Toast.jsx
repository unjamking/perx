import { motion, AnimatePresence } from "./ui.jsx";
import { CheckCircle2 } from "lucide-react";

export default function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          style={{ position: "fixed", top: 24, right: 24, zIndex: 80,
            background: "var(--dark)", color: "var(--text-on-dark)",
            padding: "14px 20px", borderRadius: 14, boxShadow: "var(--shadow-hover)",
            display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
          <CheckCircle2 size={20} color="var(--surface)" /> {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
