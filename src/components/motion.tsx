import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Images } from '@/constants/assets';
import { colors, font, s, screen } from '@/theme';
import { AppImage } from '@/components/AppImage';

/** iOS `.spring(response:dampingFraction:)` → RN stiffness/damping (mass 1). */
const spring = (value: Animated.Value, toValue: number, response: number, dampingFraction: number, delay = 0) => {
  const stiffness = (2 * Math.PI / response) ** 2;
  return Animated.spring(value, { toValue, stiffness, damping: 2 * dampingFraction * Math.sqrt(stiffness), mass: 1, delay, useNativeDriver: true });
};

/**
 * Flex props must live on the OUTER `Pressable`. The caller's style lands on the
 * inner `Animated.View` (so the whole button scales, like iOS `ScaleButtonStyle`),
 * and a `flex: 1` there never reaches the row that is supposed to divide its width
 * — the Pressable shrink-wraps to the content instead. Hoisting them here fixes
 * every call site at once; they are stripped from the inner style so the value
 * cannot be applied twice.
 */
const FLEX_PROPS = ['flex', 'flexGrow', 'flexShrink', 'flexBasis'] as const;

/** iOS `ScaleButtonStyle`: pressed scale 0.92, spring(response .3, damping .6). */
export function PressScale({ onPress, disabled, style, children, haptic = 'light' }: React.PropsWithChildren<{ onPress(): void; disabled?: boolean; style?: StyleProp<ViewStyle>; haptic?: 'light' | 'medium' | 'none' }>) {
  const scale = useRef(new Animated.Value(1)).current;
  // `StyleSheet.flatten` can return the registered style object itself, so copy
  // before deleting anything out of it.
  const inner: ViewStyle = { ...(StyleSheet.flatten(style) ?? {}) };
  const outer: ViewStyle = {};
  for (const key of FLEX_PROPS) {
    if (inner[key] !== undefined) { (outer as Record<string, unknown>)[key] = inner[key]; delete inner[key]; }
  }
  return (
    <Pressable
      style={outer}
      disabled={disabled}
      onPressIn={() => spring(scale, 0.92, 0.3, 0.6).start()}
      onPressOut={() => spring(scale, 1, 0.3, 0.6).start()}
      onPress={() => {
        if (haptic !== 'none') void Haptics.impactAsync(haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Animated.View style={[inner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** iOS `SlideInCard`: even indexes enter from the left, odd from the right, spring(response .5, damping .8) delayed index×80ms once `appeared` flips. */
export function SlideInCard({ index, appeared, children }: React.PropsWithChildren<{ index: number; appeared: boolean }>) {
  const progress = useRef(new Animated.Value(appeared ? 1 : 0)).current;
  useEffect(() => {
    if (!appeared) { progress.setValue(0); return; }
    const animation = spring(progress, 1, 0.5, 0.8, index * 80);
    animation.start();
    return () => animation.stop();
  }, [appeared, index, progress]);
  const from = index % 2 === 0 ? -screen.width : screen.width;
  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** iOS `BlinkingBunny`: eyes open 2s, closed 1s, forever. */
export function BlinkingBunny({ width = 115.62, height = 160 }: { width?: number; height?: number }) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const blink = (isClosed: boolean) => {
      timer = setTimeout(() => {
        if (!alive) return;
        setClosed(!isClosed);
        blink(!isClosed);
      }, isClosed ? 1000 : 2000);
    };
    blink(false);
    return () => { alive = false; clearTimeout(timer); };
  }, []);
  return <AppImage source={closed ? Images.bunnyEyeCloseImg : Images.bunnyEyeOpenImg} resizeMode="stretch" style={{ width: s(width), height: s(height) }} />;
}

/** iOS `floatingAnimation(distance:duration:)`: eased vertical bob, autoreversing. */
export function useFloat(distance = 8, duration = 1.8) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const step = (toValue: number) => Animated.timing(value, { toValue, duration: duration * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1), step(0)]));
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return value.interpolate({ inputRange: [0, 1], outputRange: [0, -s(distance)] });
}

/**
 * SoftGlow — the design's blurred-circle glow behind a mascot.
 *
 * Every mascot glow in the Figma file is the same construction: a circle filled
 * #FFC7CE at 30% opacity with a LAYER BLUR of radius 100 (= Gaussian sigma 50),
 * differing only in the circle's diameter. Android clamps large blur radii, so a
 * real `FeGaussianBlur` collapses it into a small dark blob (see the Home
 * progress-card note) — these stops are the blurred-disc falloff baked into a
 * radial gradient instead.
 *
 * The stop values are for the 144.6 circle and were checked against sampled
 * pixels of the Figma render: predicted vs actual green channel matched within
 * 0.4/255 from the centre out to where the glow vanishes. `diameter` covers the
 * two smaller circles the design also uses (134.8 on Zone Detail, 97.9 on the
 * member profile) — a smaller disc under the same blur keeps almost the same
 * extent but a lower peak, so both are scaled by numerically-derived factors
 * rather than assuming the glow scales proportionally.
 *
 * `opacity` is the Figma fill opacity (0.30 for the pink mascot glow).
 */
const GLOW_STOPS: ReadonlyArray<readonly [number, number]> = [[0, 0.663], [0.25, 0.534], [0.36, 0.39], [0.5, 0.234], [0.625, 0.118], [0.75, 0.047], [1, 0]];
/** diameter → [gradient radius in design units, peak scale vs the 144.6 circle]. */
const GLOW_GEOMETRY: Record<number, readonly [number, number]> = {
  144.6: [202, 1],
  134.8: [197, 0.917],
  97.9: [179, 0.59],
};

export function SoftGlow({ color, opacity, diameter = 144.6, style }: { color: string; opacity: number; diameter?: number; style?: StyleProp<ViewStyle> }) {
  // Unique per instance: several glows can be mounted at once and a shared
  // gradient id would make them resolve to the same paint.
  const gradientId = `softGlow${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [radius, peak] = GLOW_GEOMETRY[diameter] ?? GLOW_GEOMETRY[144.6];
  const size = s(radius * 2);
  return (
    <Svg width={size} height={size} style={style} pointerEvents="none">
      <Defs>
        <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          {GLOW_STOPS.map(([offset, value]) => (
            <Stop key={offset} offset={offset} stopColor={color} stopOpacity={value * opacity * peak} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
    </Svg>
  );
}

/**
 * iOS `Circle().fill(color).blur(radius:)` — the real thing, not the radial-
 * gradient approximation above: a solid disc through an actual Gaussian blur
 * (react-native-svg ≥15.8 filters). A blurred disc keeps a flat, fully-opaque
 * core and falls off softly, which the gradient can't reproduce — on the Home
 * progress card the gradient read as a much stronger, harder-edged wash than
 * iOS. All values are design units (pre-`s()`); the canvas is the parent's
 * bounds, so a parent with `overflow: 'hidden'` clips exactly like iOS
 * `clipShape`. `cx`/`cy` place the circle's centre in the parent's coordinates.
 */
export function BlurCircle({ diameter, color, opacity, blur, cx, cy }: { diameter: number; color: string; opacity: number; blur: number; cx: number; cy: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Filter id="soft" x="-150%" y="-150%" width="400%" height="400%">
          <FeGaussianBlur in="SourceGraphic" stdDeviation={s(blur)} />
        </Filter>
      </Defs>
      <Circle cx={s(cx)} cy={s(cy)} r={s(diameter) / 2} fill={color} opacity={opacity} filter="url(#soft)" />
    </Svg>
  );
}

/** iOS bottom `LinearGradient(appBackground 0 → 1)` pinned to the screen bottom. */
export function BottomFade({ height = 154, extra = 0 }: { height?: number; extra?: number }) {
  // `extra` is RAW dp, added on top of the scaled design height. The fade is
  // anchored to the window bottom, but on Android every bottom CTA is lifted by
  // the navigation-bar inset — so without this the fade reaches LESS far above
  // the button than it does on iOS. Callers pass the amount their CTA was
  // lifted, which keeps the fade's top edge the same distance above the button
  // as iOS. Zero on gesture-nav devices, where the layout is already iOS-exact.
  return (
    <LinearGradient colors={[`${colors.background}00`, colors.background]} style={[styles.fade, { height: s(height) + extra }]} pointerEvents="none" />
  );
}

/** iOS purple CTA: appPurpleEdge capsule under an appPurple capsule inset 1.5 at the bottom, medium haptic. */
export function CapsuleCTA({ label, showPlus = false, width, height = 52, fontSize = 16, onPress, disabled, dimWhenDisabled = 0.8 }: { label: string; showPlus?: boolean; width?: number; height?: number; fontSize?: number; onPress(): void; disabled?: boolean; dimWhenDisabled?: number }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} haptic="medium" style={[styles.ctaOuter, { height: s(height), borderRadius: s(height / 2) }, width !== undefined ? { width: s(width) } : styles.ctaFill, disabled && { opacity: dimWhenDisabled }]}>
      <View style={[styles.ctaInner, { borderRadius: s(height / 2) }]}>
        {showPlus && <AppImage source={Images.plusIcon} resizeMode="contain" style={styles.ctaPlus} />}
        <Text style={{ ...font('semibold', fontSize), color: colors.white }}>{label}</Text>
      </View>
    </PressScale>
  );
}

/** iOS 40pt circular header button: white fill, appText 0.1 ring, soft shadow, light haptic + press scale. */
export function CircleButton({ onPress, background = colors.white, borderColor = `${colors.text}1A`, children }: React.PropsWithChildren<{ onPress(): void; background?: string; borderColor?: string }>) {
  return (
    <PressScale onPress={onPress} style={[styles.circle, { backgroundColor: background, borderColor }]}>{children}</PressScale>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaOuter: { backgroundColor: colors.purpleEdge, overflow: 'hidden', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(10), color: 'rgba(0,0,0,0.2)' }] },
  ctaFill: { alignSelf: 'stretch' },
  ctaInner: { flex: 1, marginBottom: s(1.5), backgroundColor: colors.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(10) },
  ctaPlus: { width: s(20), height: s(20), tintColor: colors.white },
  circle: { width: s(40), height: s(40), borderRadius: s(20), alignItems: 'center', justifyContent: 'center', borderWidth: 1, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(10), color: 'rgba(0,0,0,0.1)' }] },
});
