import { createContext, useContext, useState } from "react";
import { api, EMPLOYEE_ID } from "./api";

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [budget, setBudget] = useState({ total: 12000, spent: 5800 });

  const left = budget.total - budget.spent;
  const total = items.reduce((s, i) => s + i.price_all, 0);

  const add = (offer) => setItems((c) => [...c, { ...offer, cartId: Date.now() + Math.random() }]);
  const remove = (cartId) => setItems((c) => c.filter((i) => i.cartId !== cartId));
  const clear = () => setItems([]);

  async function submit() {
    await api.createSelection({
      employee_id: EMPLOYEE_ID,
      items: items.map((i) => ({ offer_id: i.id, price_all: i.price_all })),
    });
    clear();
  }

  return (
    <Ctx.Provider value={{ items, add, remove, clear, submit, total, left, budget, setBudget }}>
      {children}
    </Ctx.Provider>
  );
}
