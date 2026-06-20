import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setEmployeeId, setToken, setUnauthorizedHandler } from "./api";
import { registerForPush } from "./push";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const KEY = "perx_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTok] = useState(null);
  const [loading, setLoading] = useState(true);

  // Force logout if any call returns 401 (stale/expired token).
  useEffect(() => { setUnauthorizedHandler(() => { logout(); }); }, []);

  // Restore session on launch.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const { token: t } = JSON.parse(raw);
          setToken(t); // arm api before calling /me
          const res = await api.me();
          if (res.user) { apply(t, res.user); }
          else await AsyncStorage.removeItem(KEY);
        }
      } catch { /* offline — stay logged out */ }
      finally { setLoading(false); }
    })();
  }, []);

  function apply(t, u) {
    setTok(t); setToken(t); setUser(u); setEmployeeId(u.id);
    registerForPush(); // best-effort, no-op on simulator
  }

  async function persist(t, u) {
    apply(t, u);
    await AsyncStorage.setItem(KEY, JSON.stringify({ token: t, user: u }));
  }

  async function login(email, password) {
    const res = await api.login({ email, password });
    if (res.error) return res.error;
    await persist(res.token, res.user);
    return null;
  }

  async function changePassword(next) {
    const res = await api.changePassword({ next });
    if (res.error) return res.error;
    const me = await api.me();
    if (me.user) await persist(token, me.user);
    return null;
  }

  async function logout() {
    setTok(null); setToken(null); setUser(null); setEmployeeId(1);
    await AsyncStorage.removeItem(KEY);
  }

  return (
    <Ctx.Provider value={{ user, token, loading, login, logout, changePassword }}>
      {children}
    </Ctx.Provider>
  );
}
