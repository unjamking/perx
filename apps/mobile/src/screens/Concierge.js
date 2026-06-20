import { useState, useRef } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt } from "../theme";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";
import { useLang } from "../i18n";
import { Bounce } from "../components";

export default function Concierge({ navigation }) {
  const cart = useCart();
  const { t, lang } = useLang();
  const [msgs, setMsgs] = useState([
    { role: "ai", text: t("exodusGreeting") },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  async function send() {
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setTyping(true);
    try {
      const res = await api.concierge(text, EMPLOYEE_ID, lang);
      setMsgs((m) => [...m, { role: "ai", text: res.message, offers: res.recommendations }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: t("conciergeError") }]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.dark }} edges={["top"]}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Exodus</Text>
          <Text style={s.headerSub}>{t("exodusSub")}</Text>
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {msgs.map((m, i) => <Bubble key={i} m={m} onAdd={cart.add} />)}
        {typing && (
          <View style={[s.bubble, s.ai, { alignSelf: "flex-start" }]}>
            <Text style={{ color: C.hover, letterSpacing: 2 }}>•••</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.inputBar}>
        <TextInput style={s.input} placeholder={t("conciergePh")}
          placeholderTextColor={C.textSecondary} value={input} onChangeText={setInput}
          onSubmitEditing={send} returnKeyType="send" />
        <Bounce style={s.sendBtn} scale={0.85} onPress={send}><Ionicons name="send" size={18} color="#fff" /></Bounce>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ m, onAdd }) {
  const user = m.role === "user";
  return (
    <Animated.View entering={FadeInUp} style={{ alignSelf: user ? "flex-end" : "flex-start", maxWidth: "86%" }}>
      <View style={[s.bubble, user ? s.user : s.ai]}>
        <Text style={{ color: user ? "#fff" : C.text }}>{m.text}</Text>
      </View>
      {m.offers?.map((o) => (
        <View key={o.offer_id} style={s.offerCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: C.text }}>{o.title}</Text>
            <Text style={s.muted}>{o.provider} · {fmt(o.price_all)}</Text>
            <Text style={[s.muted, { marginTop: 4 }]}>{o.reason}</Text>
          </View>
          <Pressable style={s.plus} onPress={() => onAdd({ id: o.offer_id, title: o.title, provider: o.provider, price_all: o.price_all, category: o.category || "Wellness" })}>
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </View>
      ))}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: C.dark, padding: 16, paddingTop: 12, flexDirection: "row", alignItems: "center" },
  headerTitle: { color: C.textOnDark, fontWeight: "800", fontSize: 16 },
  headerSub: { color: C.textOnDark, opacity: 0.6, fontSize: 12 },
  bubble: { padding: 12, borderRadius: 16, ...shadow },
  user: { backgroundColor: C.accent, borderBottomRightRadius: 4 },
  ai: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  muted: { color: C.textSecondary, fontSize: 12 },
  offerCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff",
    borderRadius: R.card, padding: 12, marginTop: 8, borderWidth: 1, borderColor: C.border, ...shadow },
  plus: { backgroundColor: C.accent, borderRadius: 10, padding: 8 },
  inputBar: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.border },
  input: { flex: 1, backgroundColor: "#fff", borderWidth: 2, borderColor: C.border, borderRadius: R.btn, paddingHorizontal: 14, paddingVertical: 10, color: C.text },
  sendBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 16, justifyContent: "center" },
});
