import { useEffect, useRef } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { AppConstant } from '@/constants/AppConstant';
import { QUICK_ACTION_GIFT, QUICK_ACTION_HELP, addQuickActionListener, initialAction, syncQuickActions } from '@/services/QuickActions';

/**
 * Publish the launcher long-press menu and route its taps — iOS
 * `ContentView.processQuickAction` / `openHelpImprove`.
 *
 * Lives at the gate rather than inside a screen because both handlers need app
 * state: entitlement decides whether the gift shortcut exists at all, and the
 * mail composer needs the resolved user id for the subject line.
 */
export function useQuickActions({ hasPro, userId, openGift, ready }: {
  hasPro: boolean;
  /** Firebase uid; iOS falls back to `-` when nobody is signed in. */
  userId: string;
  /** Present the permanent-offer gift paywall — iOS's `showQuickGiftPaywall`. */
  openGift(): void;
  /**
   * False until the values above are trustworthy. iOS reads
   * `Auth.auth().currentUser` synchronously at init, so its quick action always
   * has a resolved uid; Android's `onAuthStateChanged` is async, so a cold-launch
   * action handled too early would mail a subject line with no user id in it.
   */
  ready: boolean;
}): void {
  // Refs so the listener registers ONCE and still sees fresh values.
  const handlers = useRef({ userId, openGift });
  handlers.current = { userId, openGift };

  /**
   * Publish on entitlement change AND on every return to the foreground.
   *
   * The foreground re-sync is not belt-and-braces: `ExpoQuickActionsModule.kt`
   * builds each shortcut's intent with `Intent(context, currentActivity!!::class)`,
   * so a sync attempted while no activity exists throws and is swallowed — which
   * is exactly what happens when the process is started with the screen locked, or
   * when an entitlement refresh lands while the app is backgrounded. Without this
   * the menu would silently stay stale until the next relaunch.
   */
  useEffect(() => {
    void syncQuickActions(hasPro);
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void syncQuickActions(hasPro);
    });
    return () => subscription.remove();
  }, [hasPro]);

  const consumedInitial = useRef(false);

  useEffect(() => {
    const run = (id: string) => {
      if (id === QUICK_ACTION_GIFT) { handlers.current.openGift(); return; }
      if (id !== QUICK_ACTION_HELP) return;
      const url = AppConstant.supportMailto('Help Us Improve', handlers.current.userId || '-');
      void Linking.openURL(url).catch(() => Alert.alert('No mail app found', `Write to us at ${AppConstant.supportEmail}.`));
    };

    /**
     * Cold launch. Guarded on `ready` AND a one-shot ref: this effect re-runs when
     * `ready` flips, and `QA.initial` keeps returning the launch action forever, so
     * without the ref a later re-render would present the paywall over itself.
     */
    if (ready && !consumedInitial.current) {
      const initial = initialAction();
      if (initial) { consumedInitial.current = true; run(initial.id); }
    }

    const subscription = addQuickActionListener(action => run(action.id));
    return () => subscription.remove();
  }, [ready]);
}
