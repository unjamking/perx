import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, EMPLOYEE_ID } from "./api";

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [budget, setBudget] = useState({ total: 12000, spent: 5800 });
  const [saved, setSaved] = useState(new Set()); // bookmarked offer ids
  const [subscribed, setSubscribed] = useState(new Set()); // auto-renew offer ids

  const left = budget.total - budget.spent;
  const total = items.reduce((s, i) => s + i.price_all, 0);

  const refreshBudget = useCallback(async () => {
    const all = await api.employees();
    const me = all.find((e) => e.id === EMPLOYEE_ID);
    if (me) setBudget({ total: me.budget_total, spent: me.budget_spent });
  }, []);

  const refreshSaved = useCallback(async () => {
    const bm = await api.bookmarks(EMPLOYEE_ID);
    setSaved(new Set(bm.map((o) => o.id)));
  }, []);

  const refreshSubs = useCallback(async () => {
    const subs = await api.subscriptions(EMPLOYEE_ID);
    setSubscribed(new Set(subs.filter((x) => x.active).map((x) => x.offer_id)));
  }, []);

  const toggleSubscribe = async (offerId) => {
    if (subscribed.has(offerId)) return; // cancel happens in My Benefits
    await api.subscribe(offerId);
    setSubscribed((prev) => new Set(prev).add(offerId));
  };

  useEffect(() => { refreshBudget(); refreshSaved(); refreshSubs(); }, [refreshBudget, refreshSaved, refreshSubs]);

  const add = (offer) => setItems((c) => [...c, { ...offer, cartId: Date.now() + Math.random() }]);
  const remove = (cartId) => setItems((c) => c.filter((i) => i.cartId !== cartId));
  const clear = () => setItems([]);

  const toggleSave = async (offerId) => {
    const res = await api.toggleBookmark(EMPLOYEE_ID, offerId);
    setSaved((prev) => {
      const next = new Set(prev);
      res.saved ? next.add(offerId) : next.delete(offerId);
      return next;
    });
  };

  async function submit() {
    const res = await api.createSelection({
      employee_id: EMPLOYEE_ID,
      items: items.map((i) => ({ offer_id: i.id, price_all: i.price_all })),
    });
    if (res?.error) return res.error; // surface budget/capacity errors to the UI
    clear();
    refreshBudget();
    return null;
  }

  return (
    <Ctx.Provider value={{ items, add, remove, clear, submit, total, left, budget, setBudget, saved, toggleSave, refreshSaved, refreshBudget, subscribed, toggleSubscribe, refreshSubs }}>
      {children}
    </Ctx.Provider>
  );
}
