import s from "../pages/HRDashboard.module.css";

// Full-dashboard loading placeholder: sidebar strip + stat cards + content block.
// Replaces the old centered spinner with a shape-of-the-page skeleton.
export default function DashboardSkeleton() {
  return (
    <div className={s.container}>
      <aside className={s.sidebar} />
      <main className={s.mainContent}>
        <div style={{ height: 36, width: 240, borderRadius: 8 }} className={s.skeletonRow} />
        <div className={s.statsGrid}>
          {[...Array(4)].map((_, i) => <div key={i} className={s.skelCard} />)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
          <div className={s.skelBlock} />
          <div className={s.skelBlock} />
        </div>
      </main>
    </div>
  );
}
