import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../lib/auth-context";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.amber,
            headerTitleStyle: { fontWeight: "700" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "fade",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="login"
            options={{ title: "Sign in", presentation: "modal", headerShown: false }}
          />
          <Stack.Screen name="board/[airport]" options={{ headerShown: false }} />
          <Stack.Screen
            name="flight/[id]"
            options={{ title: "Flight", headerBackTitle: "Back" }}
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
