import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow } from "../theme";
import { useAuth } from "../AuthContext";

const DEMO = "arta@techtirana.al";

export default function Auth() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email || !password) { setErr("Please enter your email and password."); return; }
    setBusy(true);
    try {
      const e = await login(email.trim(), password);
      if (e) setErr(e);
    } catch {
      setErr("Couldn't reach the server.");
    } finally { setBusy(false); }
  };

  const useDemo = () => { setEmail(DEMO); setPassword("perx1234"); setErr(""); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.dark }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn} style={s.brand}>
            <Text style={s.logo}>Perx</Text>
            <Text style={s.tagline}>Your benefits, your way 🌊</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100)} style={s.card}>
            <Text style={s.h2}>Welcome back</Text>
            <Text style={s.sub}>Sign in to your benefits</Text>

            <Field icon="mail-outline" placeholder="Email" value={email} onChange={setEmail} keyboardType="email-address" autoCap="none" />
            <Field icon="lock-closed-outline" placeholder="Password" value={password} onChange={setPassword} secure />

            {err ? <Text style={s.err}>{err}</Text> : null}

            <Pressable style={({ pressed }) => [s.btn, busy && { opacity: 0.6 }, pressed && { opacity: 0.85 }]} onPress={submit} disabled={busy}>
              <Text style={s.btnText}>{busy ? "Signing in…" : "Sign In"}</Text>
            </Pressable>

            <Text style={s.note}>Accounts are created by your HR team. Contact HR if you need access.</Text>

            <Pressable onPress={useDemo} style={s.demoBtn}>
              <Ionicons name="sparkles" size={14} color={C.accent} />
              <Text style={s.demoText}>Use demo account (Arta)</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ icon, placeholder, value, onChange, secure, keyboardType, autoCap }) {
  return (
    <View style={s.field}>
      <Ionicons name={icon} size={18} color={C.textSecondary} />
      <TextInput style={s.input} placeholder={placeholder} placeholderTextColor={C.textSecondary}
        value={value} onChangeText={onChange} secureTextEntry={secure}
        keyboardType={keyboardType} autoCapitalize={autoCap || "sentences"} autoCorrect={false} />
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { alignItems: "center", marginBottom: 28 },
  logo: { color: "#fff", fontSize: 40, fontWeight: "800" },
  tagline: { color: C.textOnDark, opacity: 0.8, marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 24, ...shadow },
  h2: { fontSize: 22, fontWeight: "800", color: C.text },
  sub: { color: C.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 2, borderColor: C.border, borderRadius: R.btn, paddingHorizontal: 14, marginBottom: 12 },
  input: { flex: 1, paddingVertical: 13, color: C.text, fontSize: 15 },
  err: { color: "#b3261e", fontWeight: "600", fontSize: 13, marginBottom: 8 },
  btn: { backgroundColor: C.accent, borderRadius: R.btn, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  note: { color: C.textSecondary, fontSize: 12, textAlign: "center", marginTop: 16, lineHeight: 17 },
  demoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },
  demoText: { color: C.accent, fontWeight: "700", fontSize: 13 },
});
