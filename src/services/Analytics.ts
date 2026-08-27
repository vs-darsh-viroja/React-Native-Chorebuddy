import { useEffect } from 'react';
import analytics from '@react-native-firebase/analytics';

/**
 * Port of iOS `AnalyticsManager`. Same event names and parameter keys, so both
 * platforms land in one Firebase funnel and can be compared side by side.
 *
 * iOS passes `Bool` parameters straight to Firebase; the React Native SDK only
 * accepts strings and numbers, so booleans are sent as 1/0.
 */
export const Analytics = {
  // Every call is wrapped: the SDK rejects malformed names/params by throwing
  // synchronously, and analytics must never be able to break a user action.
  logScreen(name: string) {
    try { void analytics().logScreenView({ screen_name: name, screen_class: name }).catch(() => undefined); } catch { /* ignore */ }
  },

  setUserId(id: string | null) {
    try { void analytics().setUserId(id).catch(() => undefined); } catch { /* ignore */ }
  },

  log(event: string, params: Record<string, string | number> = {}) {
    try { void analytics().logEvent(event, Object.keys(params).length ? params : undefined).catch(() => undefined); } catch { /* ignore */ }
  },

  signIn(method: string) { Analytics.log('sign_in', { method }); },
  signOut() { Analytics.log('sign_out'); },
  deleteAccount() { Analytics.log('delete_account'); },
  householdCreated(memberCount: number) { Analytics.log('household_created', { member_count: memberCount }); },
  householdJoined() { Analytics.log('household_joined'); },
  choreAdded(zone: string, frequency: string) { Analytics.log('chore_added', { zone, frequency }); },
  choreCompleted(zone: string) { Analytics.log('chore_completed', { zone }); },
  choreSkipped(zone: string, permanent: boolean) { Analytics.log('chore_skipped', { zone, permanent: permanent ? 1 : 0 }); },
  choreSnoozed(zone: string) { Analytics.log('chore_snoozed', { zone }); },
  markAllDone(count: number) { Analytics.log('mark_all_done', { count }); },
  zoneCreated(name: string) { Analytics.log('zone_created', { zone: name }); },
  paywallView(type: string) { Analytics.log('paywall_view', { type }); },
  purchaseSuccess(plan: string, isRestore: boolean) { Analytics.log('purchase_success', { plan, is_restore: isRestore ? 1 : 0 }); },
};

/** iOS `View.trackScreen(_:)` — logs a screen view when the screen mounts. */
export function useScreenTracking(name: string) {
  useEffect(() => { Analytics.logScreen(name); }, [name]);
}
