import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KEYBOARD_TOOLBAR_HEIGHT, useKeyboardHeight } from '@/hooks/useKeyboardHeight';

type Measured = { top: number; height: number };

const measure = (node: { measureInWindow(cb: (x: number, y: number, w: number, h: number) => void): void } | null) =>
  new Promise<Measured | null>(resolve => {
    if (typeof node?.measureInWindow !== 'function') return resolve(null);
    try {
      node.measureInWindow((_x, y, _w, h) => {
        resolve(Number.isFinite(y) && Number.isFinite(h) ? { top: y, height: h } : null);
      });
    } catch {
      resolve(null);
    }
  });

/**
 * useKeyboardAutoScroll — port of the keyboard-follow behaviour iOS implements by
 * hand on four screens.
 *
 * iOS does NOT get this from IQKeyboardManager: `SceneDelegate` sets
 * `IQKeyboardManager.shared.isEnabled = false` and keeps only the toolbar. Each
 * screen instead wraps its list in a `ScrollViewReader`, pads the scroll by the
 * keyboard height, and on both focus AND keyboard change runs
 *
 *     DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
 *         withAnimation(.easeOut(0.25)) { proxy.scrollTo(field, anchor: .center) }
 *     }
 *
 * — `JoinHouseholdView`, `CreateHouseholdView`, `AddChoreView` (More step) and
 * `ChoreDetailView`. Android needs it for a different reason: the app is
 * edge-to-edge, so the window is NOT resized when the keyboard opens and content
 * simply ends up behind it.
 *
 * The keyboard's top edge comes from the event's `endCoordinates.screenY`, NOT from
 * `windowHeight - keyboardHeight`: the first pass computed it that way and
 * overshot badly on device, because `Dimensions.get('window').height` and the
 * reported keyboard height do not agree about the system-bar zones under
 * edge-to-edge. `screenY` is absolute and needs no correction.
 *
 * The field is then centred in the SCROLL VIEW's own visible frame — iOS's
 * `anchor: .center` is relative to the scroll, not the screen — and the scroll is
 * clamped so a tall multiline field can never be pushed above that frame's top.
 */
export function useKeyboardAutoScroll() {
  const ref = useRef<ScrollView>(null);
  const offset = useRef(0);
  const [focusTick, setFocusTick] = useState(0);
  const keyboard = useKeyboardHeight();
  const keyboardTop = useKeyboardTop();
  const insets = useSafeAreaInsets();

  const onScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);

  const onFocus = useCallback(() => setFocusTick(tick => tick + 1), []);

  useEffect(() => {
    if (keyboard <= 0 || keyboardTop <= 0) return;
    // iOS waits 0.05s so the field has laid out — and here, so the scroll has
    // picked up its new bottom padding — before measuring.
    const timer = setTimeout(() => {
      void (async () => {
        const scroller = ref.current;
        const input = TextInput.State.currentlyFocusedInput();
        if (!scroller || !input) return;
        // `getNativeScrollRef()` — NOT `getScrollableNode()`, which returns a node
        // HANDLE (a number) and so has no `measureInWindow`. Measuring that instead
        // silently disabled the whole hook.
        const [frame, field] = await Promise.all([
          measure(scroller.getNativeScrollRef?.() as Parameters<typeof measure>[0]),
          measure(input as unknown as Parameters<typeof measure>[0]),
        ]);
        if (!field) return;

        // The Done bar overlays the keyboard's top edge, so treat it as occluded too.
        const occludedFrom = keyboardTop - KEYBOARD_TOOLBAR_HEIGHT;

        // Without the scroll's frame there is nothing to centre WITHIN, so degrade to
        // just making the field visible rather than doing nothing at all.
        if (!frame) {
          const overlap = field.top + field.height - occludedFrom;
          if (overlap > 1) scroller.scrollTo({ y: Math.max(0, offset.current + overlap + 16), animated: true });
          return;
        }

        const visibleTop = frame.top;
        const visibleBottom = Math.min(frame.top + frame.height, occludedFrom);
        if (visibleBottom <= visibleTop) return;

        const centreDelta = (field.top + field.height / 2) - (visibleTop + visibleBottom) / 2;
        // Never push the field's own top above the frame — matters for the tall
        // multiline notes field, which `anchor: .center` alone would clip.
        const maxDelta = field.top - visibleTop - 8;
        const delta = Math.min(centreDelta, maxDelta);
        // Only ever pull a field UP: scrolling back down as the layout settles
        // fights the user.
        if (delta <= 1) return;
        scroller.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
      })();
    }, 50);
    return () => clearTimeout(timer);
  }, [keyboard, keyboardTop, focusTick]);

  return {
    ref,
    onScroll,
    onFocus,
    /** iOS's `.padding(.bottom, keyboardHeight)` — room to scroll the last field up. */
    padBottom: keyboard > 0 ? keyboard + insets.bottom + KEYBOARD_TOOLBAR_HEIGHT : 0,
    scrollEventThrottle: 16,
  };
}

/**
 * The keyboard's top edge in screen coordinates, 0 while it is closed.
 *
 * Kept separate from `useKeyboardHeight` because that hook is also used for
 * bottom-anchored UI, where the height (plus the inset correction) is what is
 * wanted. For scrolling, the absolute edge is the only value that needs no
 * assumptions about which system bars the window includes.
 */
function useKeyboardTop(): number {
  const [top, setTop] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, event => setTop(event.endCoordinates?.screenY ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setTop(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return top;
}
