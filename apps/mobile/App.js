import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/AuthContext";
import { CartProvider } from "./src/CartContext";
import { LangProvider, useLang } from "./src/i18n";
import { Bounce } from "./src/components";
import { C } from "./src/theme";
import Auth from "./src/screens/Auth";
import ChangePassword from "./src/screens/ChangePassword";
import Home from "./src/screens/Home";
import Explore from "./src/screens/Explore";
import Perxify from "./src/screens/Perxify";
import Concierge from "./src/screens/Concierge";
import MyBenefits from "./src/screens/MyBenefits";
import Challenges from "./src/screens/Challenges";
import Profile from "./src/screens/Profile";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICON = { Home: "home", Explore: "compass", Perxify: "flame", "My Benefits": "wallet", Challenges: "trophy", Profile: "person" };

// Global concierge button — circular FAB on every tab screen so the AI is one tap
// away anywhere, not buried in Explore. Sits above the tab bar.
function ConciergeFab() {
  const nav = useNavigation();
  return (
    <Bounce style={fab.btn} scale={0.88} onPress={() => nav.navigate("Concierge")}>
      <Ionicons name="sparkles" size={24} color="#fff" />
    </Bounce>
  );
}

function Tabs() {
  const { t } = useLang();
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: C.surface,
          tabBarInactiveTintColor: C.textOnDark,
          tabBarStyle: { backgroundColor: C.dark, borderTopWidth: 0, height: 64, paddingBottom: 10, paddingTop: 8 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarLabel: t(route.name),
          tabBarIcon: ({ color, size }) => <Ionicons name={ICON[route.name]} size={size} color={color} />,
        })}
      >
        <Tab.Screen name="Home" component={Home} />
        <Tab.Screen name="Explore" component={Explore} />
        <Tab.Screen name="Perxify" component={Perxify} />
        <Tab.Screen name="My Benefits" component={MyBenefits} />
        <Tab.Screen name="Challenges" component={Challenges} />
        <Tab.Screen name="Profile" component={Profile} />
      </Tab.Navigator>
      <ConciergeFab />
    </View>
  );
}

const fab = StyleSheet.create({
  btn: {
    position: "absolute", right: 18, bottom: 80, width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});

// Gate: splash while restoring session, then Auth or the app. CartProvider keyed by
// user so it re-inits (budget/bookmarks) when a different account logs in.
function Root() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.dark, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.surface} size="large" />
      </View>
    );
  }
  if (!user) return <Auth />;
  if (user.must_change_password) return <ChangePassword />;
  return (
    <CartProvider key={user.id}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Concierge" component={Concierge} options={{ presentation: "modal" }} />
      </Stack.Navigator>
    </CartProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LangProvider>
          <AuthProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <Root />
            </NavigationContainer>
          </AuthProvider>
        </LangProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
