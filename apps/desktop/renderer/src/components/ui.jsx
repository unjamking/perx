import { motion, useMotionValue, useSpring, useInView, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ---- NumberTicker: counts from 0 to value ----
export function NumberTicker({ value, className, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 30, stiffness: 90 });
  const [display, setDisplay] = useState(0);
  useEffect(() => { if (inView) mv.set(value); }, [inView, value, mv]);
  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);
  return <span ref={ref} className={className}>{display.toLocaleString()}{suffix}</span>;
}

// ---- TextReveal: word-by-word rise ----
export function TextReveal({ text, className }) {
  return (
    <span className={className} style={{ display: "inline-block" }}>
      {text.split(" ").map((w, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden" }}>
          <motion.span
            style={{ display: "inline-block", marginRight: "0.28em" }}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ delay: 0.18 + i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ---- BlurFade: blur + rise on scroll/in-view ----
export function BlurFade({ children, delay = 0, className, inViewMargin = "-60px", once = true }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: inViewMargin }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ---- MagneticButton: pulls toward cursor ----
export function MagneticButton({ children, className, style, onClick }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 200, damping: 15 });
  const y = useSpring(0, { stiffness: 200, damping: 15 });
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.3);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.3);
  };
  const reset = () => { x.set(0); y.set(0); };
  return (
    <motion.button
      ref={ref} className={className} style={{ ...style, x, y }}
      onMouseMove={move} onMouseLeave={reset} onClick={onClick}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}

// ---- ShimmerButton ----
export function ShimmerButton({ children, className = "", onClick, style, disabled }) {
  return (
    <motion.button
      className={`shimmer ${className}`} onClick={onClick} style={style} disabled={disabled}
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
    >
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </motion.button>
  );
}

// ---- GlowCard ----
export function GlowCard({ children, className = "", glow = "#215E68", style }) {
  return (
    <motion.div
      className={`card ${className}`}
      style={{ position: "relative", padding: 24, ...style }}
      whileHover={{ y: -6, boxShadow: `0 0 0 1px ${glow}33, 0 12px 40px ${glow}33` }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

// ---- BorderBeam: rotating beam around a card edge ----
export function BorderBeam({ children, className = "", color = "#5C9396", style }) {
  return (
    <div className={`card ${className}`} style={{ position: "relative", overflow: "hidden", ...style }}>
      <motion.div
        style={{
          position: "absolute", inset: -2, borderRadius: "inherit", padding: 2,
          background: `conic-gradient(from 0deg, transparent 0%, ${color} 12%, transparent 25%)`,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

// ---- AnimatedTabs: sliding indicator with layoutId ----
export function AnimatedTabs({ tabs, active, onChange, id = "tabs" }) {
  return (
    <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", padding: 4 }}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          style={{
            position: "relative", padding: "8px 16px", borderRadius: 99, whiteSpace: "nowrap",
            fontWeight: 600, fontSize: 14, color: active === t.value ? "#fff" : "var(--text-secondary)",
          }}
        >
          {active === t.value && (
            <motion.div
              layoutId={`activeTab-${id}`}
              style={{ position: "absolute", inset: 0, background: "var(--accent)", borderRadius: 99, zIndex: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span style={{ position: "relative", zIndex: 1 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---- Marquee ----
export function Marquee({ children, pauseOnHover = true, speed = 30 }) {
  const [paused, setPaused] = useState(false);
  return (
    <div
      style={{ overflow: "hidden", width: "100%" }}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        style={{ display: "flex", gap: 16, width: "max-content" }}
        animate={{ x: paused ? undefined : ["0%", "-50%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {children}{children}
      </motion.div>
    </div>
  );
}

// ---- Dock ----
export function Dock({ items, active, onChange }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--dark)",
      display: "flex", justifyContent: "space-around", padding: "12px 8px 18px",
      borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 40,
    }}>
      {items.map((it) => {
        const on = active === it.value;
        return (
          <motion.button key={it.value} onClick={() => onChange(it.value)}
            whileTap={{ scale: 0.85 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: on ? "var(--surface)" : "var(--text-on-dark)" }}>
            <motion.span animate={{ scale: on ? 1.15 : 1 }}>{it.icon}</motion.span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{it.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export { AnimatePresence, motion };
