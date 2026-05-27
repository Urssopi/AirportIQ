import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors } from "../../lib/theme";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "search",
  board: "airplane",
  trips: "bookmark",
  account: "person-circle",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: 78,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={ICONS[route.name] ?? "ellipse"}
            size={focused ? size + 2 : size}
            color={color}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "HOME" }} />
      <Tabs.Screen name="board" options={{ title: "BOARD" }} />
      <Tabs.Screen name="trips" options={{ title: "MY TRIPS" }} />
      <Tabs.Screen name="account" options={{ title: "ACCOUNT" }} />
    </Tabs>
  );
}
