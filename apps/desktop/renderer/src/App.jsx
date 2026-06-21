import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "./components/ui.jsx";
import Login from "./pages/Login.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import EmployerDashboard from "./pages/EmployerDashboard.jsx";
import HRDashboard from "./pages/HRDashboard.jsx";
import ProviderDashboard from "./pages/ProviderDashboard.jsx";
import { session, roleRoute } from "./lib/api.js";

const page = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.3, ease: "easeOut" },
};

function Page({ children }) {
  return <motion.div {...page} style={{ minHeight: "100%" }}>{children}</motion.div>;
}

// Gate: must be logged in; if role doesn't match this route, bounce to its own dashboard.
function Protected({ role, children }) {
  const user = session.user();
  if (!user) {
    const currentHash = window.location.hash || "#/";
    if (currentHash === "#/" || currentHash === "#/change-password") {
      return children;
    }
    return <Navigate to="/" replace />;
  }
  if (user.must_change_password) return <Navigate to="/change-password" replace />;
  if (user.role !== role) return <Navigate to={roleRoute[user.role] || "/"} replace />;
  return children;
}

export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><Login /></Page>} />
        <Route path="/change-password" element={<Page><ChangePassword /></Page>} />
        <Route path="/employer" element={<Protected role="employer"><Page><EmployerDashboard /></Page></Protected>} />
        <Route path="/hr" element={<Protected role="hr"><Page><HRDashboard /></Page></Protected>} />
        <Route path="/provider" element={<Protected role="provider"><Page><ProviderDashboard /></Page></Protected>} />
      </Routes>
    </AnimatePresence>
  );
}
