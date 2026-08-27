/**
 * useKeyboardHeight — current on-screen keyboard height, in pixels.
 *
 * Ported from SC9 (`src/hooks/useKeyboardHeight.ts`). Returns 0 when the
 * keyboard is dismissed. Used to lift bottom-anchored UI above the keyboard
 * manually — `KeyboardAvoidingView` is unreliable on Android.
 *
 * Listens to:
 *   - iOS:     `keyboardWillShow` / `keyboardWillHide` (animates with keyboard)
 *   - Android: `keyboardDidShow` / `keyboardDidHide` (the `Will*` events never
 *              fire on Android — the keyboard only reports once on-screen).
 *
 * Don't subscribe to `keyboardDidChangeFrame`: it fires for every height tick
 * during the iOS open animation and re-renders per frame.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Height of the Done bar above the keyboard — the same 42 the
 * `react-native-keyboard-controller` toolbar uses in SC9's ChatView, so the
 * button lands at the identical y position.
 */
export const KEYBOARD_TOOLBAR_HEIGHT = 42;

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, e => setHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setHeight(0));

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  return height;
}
