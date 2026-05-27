import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AirportTile } from "../../components/AirportTile";
import { AIRPORTS, searchAirports, TOP_10_IATA } from "../../lib/airports";
import { colors, gradients, radii, shadow, space } from "../../lib/theme";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchAirports(query, 8), [query]);
  const top10 = useMemo(
    () => AIRPORTS.filter((a) => TOP_10_IATA.includes(a.iata)),
    [],
  );

  const go = (iata: string) => router.push(`/board/${iata}`);
  const searching = query.trim().length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={gradients.hero}
        style={styles.heroGradient}
        pointerEvents="none"
      />
      <View style={styles.hero}>
        <Text style={styles.brand}>AIRPORTIQ</Text>
        <Text style={styles.heroTitle}>Live{"\n"}Departures</Text>
        <Text style={styles.heroSubtitle}>
          Real-time boards · TSA waits · smart arrival times.
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search airport, city, or IATA"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={12}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {searching ? (
        <FlatList
          contentContainerStyle={styles.listPad}
          data={results}
          keyExtractor={(a) => a.iata}
          ListEmptyComponent={
            <Text style={styles.empty}>No matching airports.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => go(item.iata)}
              android_ripple={{ color: colors.bgRaised }}
              style={({ pressed }) => [
                styles.resultRow,
                shadow.card,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.iataBox}>
                <Text style={styles.iataBoxText}>{item.iata}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.resultCity}>{item.city}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          contentContainerStyle={[styles.listPad, { paddingHorizontal: space[4] }]}
          ListHeaderComponent={
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>TOP AIRPORTS</Text>
              <Text style={styles.sectionCounter}>
                {top10.length} of {AIRPORTS.length}
              </Text>
            </View>
          }
          data={top10}
          keyExtractor={(a) => a.iata}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <AirportTile iata={item.iata} city={item.city} onPress={() => go(item.iata)} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  heroGradient: { position: "absolute", left: 0, right: 0, top: 0, height: 320 },
  hero: { paddingHorizontal: space[5], paddingTop: space[5], paddingBottom: space[4] },
  brand: {
    color: colors.amber,
    fontSize: 11,
    letterSpacing: 4,
    fontWeight: "700",
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 8,
    lineHeight: 48,
  },
  heroSubtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 10, lineHeight: 20 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: space[5],
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    marginLeft: 10,
    paddingVertical: 0,
  },
  listPad: { paddingHorizontal: space[5], paddingBottom: space[7] },
  empty: { color: colors.textSecondary, textAlign: "center", marginTop: 24 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 10,
  },
  iataBox: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iataBoxText: { color: colors.amber, fontWeight: "800", letterSpacing: 3, fontSize: 16 },
  resultName: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  resultCity: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  sectionCounter: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
});
