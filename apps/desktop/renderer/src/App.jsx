import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "./components/ui.jsx";
import Login from "./pages/Login.jsx";
import EmployerDashboard from "./pages/EmployerDashboard.jsx";
import HRDashboard from "./pages/HRDashboard.jsx";
import ProviderDashboard from "./pages/ProviderDashboard.jsx";

const page = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.3, ease: "easeOut" },
};

function Page({ children }) {
  return <motion.div {...page} style={{ minHeight: "100%" }}>{children}</motion.div>;
}

export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><Login /></Page>} />
        <Route path="/employer" element={<Page><EmployerDashboard /></Page>} />
        <Route path="/hr" element={<Page><HRDashboard /></Page>} />
        <Route path="/provider" element={<Page><ProviderDashboard /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}
