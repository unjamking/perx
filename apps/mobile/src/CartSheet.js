import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, FlatList } from "react-native";
import Animated, { Layout } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { C, R, fmt } from "./theme";
import { PrimaryButton } from "./components";
import { useCart } from "./CartContext";

export default function CartSheet({ open, onClose }) {
  const cart = useCart();
  const after = cart.left - cart.total;
  const [err, setErr] = useState("");
  const submit = async () => {
    setErr("");
    const e = await cart.submit();
    if (e) setErr(e); else onClose();
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.sheetHead}>
          <Text style={s.h3}>Your Cart</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={C.textSecondary} /></Pressable>
        </View>
        <FlatList
          data={cart.items}
          keyExtractor={(i) => String(i.cartId)}
          ListEmptyComponent={<Text style={s.muted}>Cart is empty.</Text>}
          renderItem={({ item }) => (
            <Animated.View layout={Layout} style={s.cartRow}>
              <Text style={{ fontSize: 22 }}>{item.category.split(" ")[0]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>{item.title}</Text>
                <Text style={s.muted}>{item.provider}</Text>
              </View>
              <Text style={s.price}>{fmt(item.price_all)}</Text>
              <Pressable onPress={() => cart.remove(item.cartId)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={C.textSecondary} />
              </Pressable>
            </Animated.View>
          )}
          style={{ maxHeight: 280 }}
        />
        {cart.items.length > 0 && (
          <>
            <View style={s.totalRow}><Text style={s.muted}>Total</Text><Text style={{ fontWeight: "800" }}>{fmt(cart.total)}</Text></View>
            <View style={s.totalRow}>
              <Text style={s.muted}>Remaining after</Text>
              <Text style={{ fontWeight: "700", color: after < 0 ? "#b3261e" : C.textSecondary }}>{fmt(after)}</Text>
            </View>
            {err ? <Text style={s.err}>{err}</Text> : null}
            <PrimaryButton label={after < 0 ? "Over budget" : "Request Approval →"} disabled={after < 0}
              style={{ marginTop: 14 }} onPress={submit} />
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(1,49,55,0.4)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 99, backgroundColor: C.border, marginBottom: 14 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  h3: { fontWeight: "800", fontSize: 18, color: C.text },
  muted: { color: C.textSecondary, fontSize: 13 },
  price: { color: C.accent, fontWeight: "800" },
  err: { color: "#b3261e", fontWeight: "600", fontSize: 13, marginTop: 10 },
  cartRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
});
