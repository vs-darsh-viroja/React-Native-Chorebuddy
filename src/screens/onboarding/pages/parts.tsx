import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';
import { colors, s } from '@/theme';

/** SF Pro Rounded ascender, as a fraction of the point size. */
const ASCENT = 0.9552;
let gradientSeed = 0;

/**
 * iOS `gradientForeground(colors:)` masks a topLeading -> bottomTrailing gradient
 * with the glyphs. RN has no text mask, so an invisible `Text` still performs the
 * measurement and baseline participation while an SVG copy paints the glyphs with
 * the gradient fill.
 */
export function GradientText({ value, style, ramp }: { value: string; style: TextStyle; ramp: [string, string] }) {
  const id = useRef(`textGradient${(gradientSeed += 1)}`).current;
  return (
    <View>
      <Text style={[style, styles.measured]}>{value}</Text>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ramp[0]} />
            <Stop offset="1" stopColor={ramp[1]} />
          </SvgGradient>
        </Defs>
        <SvgText x={0} y={(style.fontSize ?? 0) * ASCENT} fill={`url(#${id})`} fontFamily={style.fontFamily} fontSize={style.fontSize} letterSpacing={style.letterSpacing}>
          {value}
        </SvgText>
      </Svg>
    </View>
  );
}

/** iOS: `LinearGradient(colors: [appPurple.opacity(0.2), appPurple.opacity(0)], top -> bottom)` pinned to the top. */
export function TopGlow({ height }: { height: number }) {
  return <LinearGradient colors={[`${colors.purple}33`, `${colors.purple}00`]} style={[styles.glow, { height: s(height) }]} pointerEvents="none" />;
}

/**
 * SwiftUI fades these art layers out with a vertical white -> clear `.mask(...)`.
 * The onboarding background is opaque, so painting the identical ramp in the
 * background colour over the art reproduces it exactly without pulling in a
 * native masked-view dependency.
 */
export function FadeOutMask({ opaqueUntil, clearFrom, style }: { opaqueUntil: number; clearFrom: number; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[`${colors.background}00`, `${colors.background}00`, colors.background]}
      locations={[0, opaqueUntil, clearFrom]}
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
    />
  );
}

/** iOS: `withAnimation(.easeInOut(duration:).repeatForever(autoreverses: true)) { value = travel }`. */
export function useFloat(travel: number, duration: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const step = (toValue: number) => Animated.timing(value, { toValue, duration: duration * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]));
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return value.interpolate({ inputRange: [0, 1], outputRange: [0, s(travel)] });
}

/** iOS `.spring(response:dampingFraction:)` expressed as the equivalent RN spring. */
export function spring(value: Animated.Value, toValue: number, response: number, dampingFraction: number) {
  const stiffness = (2 * Math.PI / response) ** 2;
  return Animated.spring(value, { toValue, stiffness, damping: 2 * dampingFraction * Math.sqrt(stiffness), mass: 1, useNativeDriver: true });
}

/** SwiftUI `.shadow(color:radius:x:y:)` on a filled shape; SwiftUI's radius is half a CSS blur radius. */
export const shadow = (color: string, radius: number, y: number) => ({ boxShadow: [{ offsetX: 0, offsetY: s(y), blurRadius: s(radius * 2), color }] });

/** The same shadow for artwork: SwiftUI follows the alpha shape, so this needs a filter rather than a box shadow. */
export const artShadow = (color: string, radius: number, y: number) => ({
  filter: [{ dropShadow: { offsetX: 0, offsetY: s(y), standardDeviation: s(radius), color } }],
});

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0 },
  /**
   * BOTH `color: 'transparent'` AND `opacity: 0`.
   *
   * This `Text` exists only to size the container and hold the baseline — the
   * SVG copy paints the visible glyphs. Belt-and-braces because a colour alone
   * is defeated by anything that re-specifies `color` downstream, and the
   * failure mode is the measuring copy showing THROUGH the gradient copy as a
   * misaligned second rendering (the two never line up exactly: RN and SVG
   * apply `letterSpacing` differently). `opacity: 0` cannot be overridden by a
   * colour, so at most one copy is ever visible.
   */
  measured: { color: 'transparent', opacity: 0, includeFontPadding: false },
});
