import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * iOS `ProgressView(.circular)` — the eight-spoke indicator used on the sign-in
 * button and the launch `LoadingScreen`.
 *
 * RN's `ActivityIndicator` is an Android `ProgressBar` (a single Material arc),
 * which is both a different shape from iOS and unreliable here: on this build it
 * rendered a few pixels wide instead of its 36dp box inside `LoadingScreen`.
 * Drawing the spokes ourselves fixes the size deterministically and matches the
 * iOS artwork, and the rotation is transform-only so it stays on the native
 * driver.
 *
 * Geometry follows `UIActivityIndicatorView`: eight rounded spokes, each about
 * 0.30 of the frame long and 0.09 wide, their outer tips at the frame edge, with
 * opacity fading around the ring.
 */
export function Spinner({ size = 20, color = '#000000', style }: { size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const length = size * 0.3;
  const width = Math.max(1, size * 0.09);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ rotate }] }, style]}>
      {SPOKES.map((angle, index) => (
        <View key={angle} style={[styles.spoke, { transform: [{ rotate: `${angle}deg` }] }]}>
          <View style={{ width, height: length, borderRadius: width / 2, backgroundColor: color, opacity: 1 - index * 0.1 }} />
        </View>
      ))}
    </Animated.View>
  );
}

const SPOKES = [0, 45, 90, 135, 180, 225, 270, 315];

const styles = StyleSheet.create({
  // Each spoke rotates about the frame centre and sits against the top edge, so
  // the ring's outer tips touch the frame like the iOS indicator's do.
  spoke: { ...StyleSheet.absoluteFillObject, alignItems: 'center' },
});
