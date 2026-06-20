import "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/AuthContext";
import { CartProvider } from "./src/CartContext";
import { C } from "./src/theme";
import Auth from "./src/screens/Auth";
import ChangePassword from "./src/screens/ChangePassword";
import Home from "./src/screens/Home";
import Explore from "./src/screens/Explore";
import Concierge from "./src/screens/Concierge";
import MyBenefits from "./src/screens/MyBenefits";
import Challenges from "./src/screens/Challenges";
import Profile from "./src/screens/Profile";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICON = { Home: "home", Explore: "compass", "My Benefits": "wallet", Challenges: "trophy", Profile: "person" };

function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreHome" component={Explore} />
      <Stack.Screen name="Concierge" component={Concierge} />
    </Stack.Navigator>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.surface,
        tabBarInactiveTintColor: C.textOnDark,
        tabBarStyle: { backgroundColor: C.dark, borderTopWidth: 0, height: 64, paddingBottom: 10, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => <Ionicons name={ICON[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Explore" component={ExploreStack} />
      <Tab.Screen name="My Benefits" component={MyBenefits} />
      <Tab.Screen name="Challenges" component={Challenges} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

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
      <Tabs />
    </CartProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
