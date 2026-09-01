import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Easing, PanResponder, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Images } from '@/constants/assets';
import { CheckmarkGlyph } from '@/components/glyphs';
import { PressScale } from '@/components/motion';
import { colors, font, s, screen } from '@/theme';
import { bottomBar } from '@/services/BottomBar';
import { KEYBOARD_TOOLBAR_HEIGHT, useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { AppImage } from '@/components/AppImage';

/** iOS sheets are `screenSize.height * (617/812)` tall. */
export const SHEET_HEIGHT = screen.height * (617 / 812);

/**
 * iOS `BottomSheetAnimation`: present is spring(response .42, dampingFraction .9),
 * dismiss is easeIn 280ms with a matching 280ms delay before the state clears.
 * Dragging past 110pt (or flicking) dismisses, otherwise the card springs back.
 */
export function useSheetAnimation(onClose: () => void) {
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    const stiffness = (2 * Math.PI / 0.42) ** 2;
    Animated.spring(progress, { toValue: 1, stiffness, damping: 2 * 0.9 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
  }, [progress]);

  // iOS `appState.hideBottomBar = true` on present / `false` on dismiss. Doing it
  // here covers every sheet — the shared `BottomSheet` and the two hand-rolled
  // ones in `StatsFilterSheet` — and cannot be forgotten at a call site.
  useEffect(() => {
    bottomBar.hide();
    return () => bottomBar.show();
  }, []);

  const close = (after?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: 280, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => { after?.(); onClose(); });
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => drag.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > s(110) || gesture.vy > 1.2) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        close();
      } else {
        const stiffness = (2 * Math.PI / 0.3) ** 2;
        Animated.spring(drag, { toValue: 0, stiffness, damping: 2 * 0.85 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
      }
    },
  })).current;

  return { progress, drag, close, pan };
}

const SheetContext = createContext<{ close(after?: () => void): void } | null>(null);
export function useSheet() {
  const value = useContext(SheetContext);
  if (!value) throw new Error('useSheet must be used inside a BottomSheet');
  return value;
}

/** iOS `BlinkingBunnyPeek`: bunnyImg4/bunnyImg5 swapped on the 2s/1s blink cycle. */
export function PeekBunny({ width = 113, height = 104 }: { width?: number; height?: number }) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const blink = (isClosed: boolean) => { timer = setTimeout(() => { if (!alive) return; setClosed(!isClosed); blink(!isClosed); }, isClosed ? 1000 : 2000); };
    blink(false);
    return () => { alive = false; clearTimeout(timer); };
  }, []);
  return <AppImage source={closed ? Images.bunnyImg5 : Images.bunnyImg4} resizeMode="stretch" style={{ width: s(width), height: s(height) }} />;
}

/** iOS `BunnyPeekHands`: the two paws gripping the sheet's top edge, 65pt apart. */
export function PeekHands({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.hands, style]} pointerEvents="none">
      <AppImage source={Images.bunnyRightHandImg} resizeMode="stretch" style={styles.hand} />
      <AppImage source={Images.bunnyLeftHandImg} resizeMode="stretch" style={styles.hand} />
    </View>
  );
}

/**
 * The iOS sheet chrome: dimmed backdrop, top-rounded card with the 0.2 border,
 * grab handle, and the peeking bunny. `bunny` picks the iOS anchor — most sheets
 * offset the bunny left of centre, the calendar-style sheets pin it to the
 * leading edge. `height="auto"` matches the sheets that size to their content.
 */
export function BottomSheet({ onClose, height = SHEET_HEIGHT, bunny = 'offset', children }: { onClose(): void; height?: number | 'auto'; bunny?: 'offset' | 'leading' | 'none'; children: React.ReactNode }) {
  const { progress, drag, close, pan } = useSheetAnimation(onClose);
  // The card is flush with the window bottom, which on edge-to-edge Android is
  // BEHIND the navigation bar. Padding the card here lifts every sheet's content
  // (CTAs included) clear of the bar in one place, so individual footers keep
  // their plain iOS design padding — exactly how iOS measures from the safe area.
  const insets = useSafeAreaInsets();
  const travel = height === 'auto' ? screen.height : height;
  return (
    <SheetContext.Provider value={{ close }}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.backdrop, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        <Animated.View style={[styles.wrap, { transform: [{ translateY: Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [travel, 0] }), drag) }] }]}>
          {bunny !== 'none' && (
            <View style={[styles.peek, bunny === 'leading' ? styles.peekLeading : styles.peekOffset]} pointerEvents="none">
              <PeekBunny />
            </View>
          )}
          <View style={[styles.card, height === 'auto' ? null : { height }, { paddingBottom: insets.bottom }]} {...pan.panHandlers}>
            <View style={styles.handle} />
            {children}
          </View>
          {bunny !== 'none' && <PeekHands style={bunny === 'leading' ? styles.handsLeading : undefined} />}
        </Animated.View>
      </View>
    </SheetContext.Provider>
  );
}


/**
 * Bottom padding for a footer that sits at the bottom of a sheet CARD, in flow
 * layout.
 *
 * The card pads `insets.bottom` for the navigation bar, and a flow child inherits
 * that — so a footer that ALSO carries its full iOS design offset ends up with the
 * two stacked. iOS's 55 is ~63dp of design offset here; adding a 48dp bar on top
 * put the Done button 111dp above the window edge instead of ~63.
 *
 * Subtracting the inset makes the TOTAL `Math.max(s(design), insets.bottom + s(16))`
 * from the window edge — the same rule every bottom CTA in the app follows, and
 * within ~3dp of iOS's own offset on a three-button bar. On a gesture-nav device
 * with no inset it is exactly the iOS value.
 *
 * A new sheet that forgets this still gets the card's inset, so the failure mode
 * stays "slightly over-padded" rather than "CTA behind the navigation bar".
 */
export function sheetFooterPad(design: number, bottomInset: number) {
  return Math.max(s(design) - bottomInset, s(16));
}

/**
 * KeyboardDoneBar — hand-built copy of SC9 ChatView's keyboard "Done" button.
 *
 * MOUNTED ONCE AT THE APP ROOT (`App.tsx`), not per sheet. iOS gets this bar over
 * EVERY text field in the app, from `SceneDelegate`'s
 * `IQKeyboardManager.shared.enableAutoToolbar = true` (QuickActionManager.swift) —
 * so a screen-level field like Chore Detail's notes has it too, which it did not
 * when this lived inside `BottomSheet`. Rendering it last in the root tree also
 * keeps it above any open sheet.
 *
 * SC9 gets this from `react-native-keyboard-controller`'s `<KeyboardToolbar>`,
 * which ChoreBuddy does not depend on; SC9's own note records that the library
 * toolbar closed every bottom sheet on tap (Android Modal dismiss propagation),
 * which is exactly the context here — so it is rebuilt by hand instead.
 *
 * Geometry is copied verbatim from the library's stylesheet so the button lands
 * at the identical x/y as SC9:
 *   toolbar  position absolute, bottom 0 (sat directly on the keyboard top),
 *            width 100%, height 42, row, alignItems center, bg #f3f3f4
 *   done     marginLeft 8 / marginRight 16, fontSize 15, weight 600, #2c2c2c
 * These are raw pixel values, NOT `s()`-scaled — the library does not scale
 * them either, and matching SC9 exactly is the requirement.
 */
export function KeyboardDoneBar() {
  const kbHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  if (kbHeight <= 0) return null;
  // Edge-to-edge + `adjustResize`: the window is NOT resized, and
  // `Keyboard.endCoordinates.height` under-reports by the bottom inset — so the
  // bar must lift by `kbHeight + insets.bottom` to sit on the keyboard's top
  // edge. Same formula SC9's ChatView uses for its input bar under the same
  // Android config.
  return (
    <View style={[styles.kbBar, { bottom: kbHeight + insets.bottom }]}>
      <View style={styles.kbSpacer} />
      <Pressable style={styles.kbDoneWrap} onPress={() => Keyboard.dismiss()} hitSlop={8}>
        <Text style={styles.kbDone}>Done</Text>
      </Pressable>
    </View>
  );
}

/** iOS sheet header: 20pt medium title with the bordered ✕ circle. */
export function SheetHeader({ title, onClose, borderOpacity = 0.2 }: { title: string; onClose?(): void; borderOpacity?: number }) {
  const { close } = useSheet();
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <PressScale onPress={() => { onClose?.(); close(); }} style={[styles.closeCircle, { borderColor: `rgba(31,31,31,${borderOpacity})` }]}>
        <Text style={styles.closeX}>✕</Text>
      </PressScale>
    </View>
  );
}

/** iOS filter checkbox: bordered box that fills purple with a springing tick. */
export function SheetCheckbox({ on, size = 22, radius = 4, tick = 11 }: { on: boolean; size?: number; radius?: number; tick?: number }) {
  const value = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    const stiffness = (2 * Math.PI / 0.35) ** 2;
    Animated.spring(value, { toValue: on ? 1 : 0, stiffness, damping: 2 * 0.6 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
  }, [on, value]);
  return (
    <View style={{ width: s(size), height: s(size), alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: s(radius), borderWidth: 1.5, borderColor: `${colors.text}33`, opacity: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: s(radius), backgroundColor: colors.purple, opacity: value, alignItems: 'center', justifyContent: 'center', transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
        <CheckmarkGlyph width={s(tick)} height={s(tick * 0.727)} color={colors.white} strokeWidth={2.2} />
      </Animated.View>
    </View>
  );
}

/** iOS radio: 22pt ring that gains a 15pt purple core when selected. */
export function SheetRadio({ on }: { on: boolean }) {
  return (
    <View style={[styles.radio, { borderColor: on ? colors.purple : `${colors.text}33` }]}>
      {on && <View style={styles.radioCore} />}
    </View>
  );
}

/** iOS sheet CTA: full-width purple capsule. */
export function SheetCTA({ label, onPress, disabled, shadow = false }: { label: string; onPress(): void; disabled?: boolean; shadow?: boolean }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} haptic="none" style={[styles.cta, disabled && styles.ctaDisabled, shadow && styles.ctaShadow]}>
      <Text style={styles.ctaLabel}>{label}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  peek: { position: 'absolute', top: -s(93), left: 0, right: 0 },
  peekOffset: { alignItems: 'center', transform: [{ translateX: -s(91.5) }] },
  peekLeading: { alignItems: 'flex-start', paddingLeft: s(43.5), top: -s(90) },
  hands: { position: 'absolute', top: -s(10), left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: s(65), transform: [{ translateX: -s(91.5) }] },
  handsLeading: { justifyContent: 'flex-start', paddingLeft: s(45), transform: [{ translateX: 0 }] },
  hand: { width: s(24), height: s(22) },
  card: { borderTopLeftRadius: s(16), borderTopRightRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderBottomWidth: 0, borderColor: `${colors.text}33`, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: s(36), height: s(5), borderRadius: s(2.5), backgroundColor: `${colors.text}33`, marginTop: s(10) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(15), paddingTop: s(18) },
  headerTitle: { ...font('medium', 20), lineHeight: s(23.9), includeFontPadding: false, color: colors.text, flexShrink: 1 },
  closeCircle: { width: s(28), height: s(28), borderRadius: s(14), borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: s(10) },
  closeX: { fontSize: s(11), color: `${colors.text}CC`, fontWeight: '600' },
  radio: { width: s(22), height: s(22), borderRadius: s(11), borderWidth: s(1.5), alignItems: 'center', justifyContent: 'center' },
  radioCore: { width: s(15), height: s(15), borderRadius: s(7.5), backgroundColor: colors.purple },
  kbBar: { position: 'absolute', left: 0, right: 0, height: KEYBOARD_TOOLBAR_HEIGHT, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f3f4' },
  kbSpacer: { flex: 1 },
  kbDoneWrap: { marginLeft: 8, marginRight: 16 },
  kbDone: { fontSize: 15, fontWeight: '600', color: '#2c2c2c' },
  cta: { height: s(52), borderRadius: s(26), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { backgroundColor: `${colors.purple}66` },
  ctaShadow: { boxShadow: [{ offsetX: 0, offsetY: s(4), blurRadius: s(10), color: 'rgba(152,113,232,0.3)' }] },
  ctaLabel: { ...font('semibold', 16), color: colors.white },
});
