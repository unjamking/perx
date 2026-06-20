import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow } from "../theme";
import { useAuth } from "../AuthContext";

// Forced new-password screen for HR-provisioned accounts.
export default function ChangePassword() {
  const { changePassword, logout } = useAuth();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    if (next.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (next !== confirm) { setErr("Passwords don't match."); return; }
    setBusy(true);
    try {
      const e = await changePassword(next);
      if (e) setErr(e);
    } catch { setErr("Couldn't reach the server."); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.dark }}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "center", padding: 24 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.card}>
          <Text style={s.h2}>Set a new password</Text>
          <Text style={s.sub}>Your account uses a temporary password. Choose a new one to continue.</Text>
          <Field placeholder="New password" value={next} onChange={setNext} />
          <Field placeholder="Confirm new password" value={confirm} onChange={setConfirm} />
          {err ? <Text style={s.err}>{err}</Text> : null}
          <Pressable style={({ pressed }) => [s.btn, busy && { opacity: 0.6 }, pressed && { opacity: 0.85 }]} onPress={submit} disabled={busy}>
            <Text style={s.btnText}>{busy ? "Saving…" : "Save Password"}</Text>
          </Pressable>
          <Pressable onPress={logout} style={{ marginTop: 14 }}>
            <Text style={s.link}>Cancel & sign out</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ placeholder, value, onChange }) {
  return (
    <View style={s.field}>
      <Ionicons name="lock-closed-outline" size={18} color={C.textSecondary} />
      <TextInput style={s.input} placeholder={placeholder} placeholderTextColor={C.textSecondary}
        value={value} onChangeText={onChange} secureTextEntry autoCapitalize="none" />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 24, ...shadow },
  h2: { fontSize: 22, fontWeight: "800", color: C.text },
  sub: { color: C.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderWidth: 2, borderColor: C.border, borderRadius: R.btn, paddingHorizontal: 14, marginBottom: 12 },
  input: { flex: 1, paddingVertical: 13, color: C.text, fontSize: 15 },
  err: { color: "#b3261e", fontWeight: "600", fontSize: 13, marginBottom: 8 },
  btn: { backgroundColor: C.accent, borderRadius: R.btn, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  link: { textAlign: "center", color: C.textSecondary, fontWeight: "600", fontSize: 13 },
});
