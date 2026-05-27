import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

import { colors, radii } from "../lib/theme";

/**
 * Pulsing placeholder block. Stacks naturally; pass `height` and `width`
 * (or `style`) to size individual rows.
 */
export function Skeleton({
  height = 16,
  width,
  rounded = radii.sm,
  style,
}: {
  height?: number;
  width?: number | "100%";
  rounded?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        styles.base,
        { height, width: width as ViewStyle["width"], borderRadius: rounded, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.bgRaised, width: "100%" },
});
