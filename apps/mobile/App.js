import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CartProvider } from "./src/CartContext";
import { C } from "./src/theme";
import Browse from "./src/screens/Browse";
import Concierge from "./src/screens/Concierge";
import Requests from "./src/screens/Requests";

const Tab = createBottomTabNavigator();

const ICON = { Browse: "grid", Concierge: "sparkles", Requests: "receipt" };

export default function App() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: C.surface,
              tabBarInactiveTintColor: C.textOnDark,
              tabBarStyle: { backgroundColor: C.dark, borderTopWidth: 0, height: 64, paddingBottom: 10, paddingTop: 8 },
              tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={ICON[route.name]} size={size} color={color} />
              ),
            })}
          >
            <Tab.Screen name="Browse" component={Browse} />
            <Tab.Screen name="Concierge" component={Concierge} />
            <Tab.Screen name="Requests" component={Requests} />
          </Tab.Navigator>
        </NavigationContainer>
      </CartProvider>
    </SafeAreaProvider>
  );
}
