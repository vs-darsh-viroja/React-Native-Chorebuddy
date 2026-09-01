import * as QA from 'expo-quick-actions';

/**
 * Port of iOS `QuickActionManager` — the launcher long-press menu ("app
 * shortcuts" on Android, "Home Screen quick actions" on iOS). Long-pressing the
 * icon is also how a user reaches Uninstall, so these are the two retention
 * affordances iOS surfaces at that exact moment:
 *
 *   unlockOffer  — FREE USERS ONLY. Opens the gift paywall as a permanent offer.
 *   helpImprove  — Opens the support mail composer.
 *
 * WHY THE SET IS REBUILT RATHER THAN DECLARED STATICALLY: iOS assigns
 * `UIApplication.shared.shortcutItems` on every entitlement change so a
 * subscriber never sees a discount offer. Entitlement is only known at runtime,
 * so these are Android DYNAMIC shortcuts (`ShortcutManager.dynamicShortcuts`,
 * replaced wholesale per call) — a static `res/xml/shortcuts.xml` cannot be
 * conditional.
 *
 * ANDROID DROPS THE SUBTITLE — a real divergence, not an oversight.
 * `ExpoQuickActionsModule.kt` builds each shortcut
 * `setShortLabel(title).setLongLabel(title)`; there is no third label and
 * `subtitle` is documented iOS-only. So iOS's two-line design
 * ("Wait! Don't go yet" / "Unlock a special offer just for you") has ONE line
 * here, and the title has to carry the payload rather than the hook — a single
 * visible line reading "Wait! Don't go yet" never states the offer. iOS's own
 * strings are still supplied as `subtitle` so an iOS build of this code renders
 * the intended two lines with no further work.
 *
 * ICONS are Android resource names written by `plugins/withQuickActionIcons.js`
 * (the module resolves them with `getIdentifier(name, "drawable", pkg)`), drawing
 * the same heart and envelope iOS asks UIKit for via `.love` / `.mail`.
 */

export const QUICK_ACTION_GIFT = 'com.chorebuddy.quickaction.unlockOffer';
export const QUICK_ACTION_HELP = 'com.chorebuddy.quickaction.helpImprove';

/**
 * LENGTH IS A REAL CONSTRAINT. The long-press popup uses the LONG label, whose
 * practical budget is ~25 characters; "Unlock your special offer" is exactly 25
 * and is the string verified rendering in full on a moto g35 in the sibling app.
 * Don't lengthen these.
 */
const GIFT_ACTION: QA.Action = {
  id: QUICK_ACTION_GIFT,
  title: 'Unlock your special offer',
  subtitle: 'Unlock a special offer just for you',
  icon: 'ic_shortcut_gift',
};

const HELP_ACTION: QA.Action = {
  id: QUICK_ACTION_HELP,
  title: 'Tell us what went wrong',
  subtitle: "Tell us what went wrong, let's fix it",
  icon: 'ic_shortcut_help',
};

/**
 * Publish the menu for the current entitlement — iOS
 * `QuickActionManager.updateItems(hasPro:)`.
 *
 * Called on every entitlement change, not only at launch: someone who subscribes
 * mid-session must lose the discount shortcut without relaunching, and someone
 * whose subscription lapses must get it back.
 */
export async function syncQuickActions(hasPro: boolean): Promise<void> {
  try {
    if (!(await QA.isSupported())) return;
    const items = hasPro ? [HELP_ACTION] : [GIFT_ACTION, HELP_ACTION];
    // `maxCount` is read rather than assumed: an OEM launcher can report fewer
    // than the usual 4, and a silently dropped shortcut is invisible in testing.
    const max = QA.maxCount ?? items.length;
    await QA.setItems(items.slice(0, max));
  } catch (error) {
    if (__DEV__) console.warn('[QuickActions] sync failed:', error);
  }
}

/**
 * The action the app was COLD-LAUNCHED from, if any — iOS
 * `connectionOptions.shortcutItem`.
 *
 * `expo-quick-actions` reads this once at module scope, so it is a plain value
 * and keeps returning the launch action for the whole session; the consumer must
 * act on it exactly once (see `useQuickActions`).
 */
export function initialAction(): QA.Action | undefined {
  return QA.initial;
}

/** Warm-start taps — iOS `performActionFor`; Android delivers via `onNewIntent`. */
export function addQuickActionListener(handler: (action: QA.Action) => void): { remove: () => void } {
  return QA.addListener(handler);
}
