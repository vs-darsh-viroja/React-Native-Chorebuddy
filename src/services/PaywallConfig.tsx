import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import remoteConfig from '@react-native-firebase/remote-config';
import Constants from 'expo-constants';

const appVersion = Constants.expoConfig?.version ?? '1.0.0';

export interface PaywallConfig {
  isShowOnboardingPaywall: boolean;
  isShowGiftPaywall: boolean;
  isShowPaywallCloseButton: boolean;
  isShowDelayPaywallCloseButton: boolean;
  closeButtonDelayTime: number;
  defaultSubscriptionPlan: number;
  isShowDiscountPercentage: boolean;
  discountPercentage: number;
  isApproved: boolean;
  isShowGuaranteeText: boolean;
  isShowUserCount: boolean;
  randomNumberStart: number;
  randomNumberEnd: number;
  freeTrialPlan: boolean;
  showLifeTimeBannerAtHome: boolean;
  freeChoreLimit: number;
  freeZoneLimit: number;
  isForceUpdateRequired: boolean;
  minimumAppVersion: string;
  /** iOS `showForceUpdateAlert` — the flag AND the installed version being older than the minimum. */
  showForceUpdateAlert: boolean;
  isShowInactivityNotification: boolean;
  inactivityDays1: number;
  inactivityDays2: number;
  inactivityDays3: number;
  inactivityNotificationTitle: string;
  inactivityNotificationBody: string;
}

const defaults: PaywallConfig = {
  isShowOnboardingPaywall: true,
  isShowGiftPaywall: true,
  isShowPaywallCloseButton: true,
  isShowDelayPaywallCloseButton: false,
  closeButtonDelayTime: 3,
  defaultSubscriptionPlan: 2,
  isShowDiscountPercentage: true,
  discountPercentage: 85,
  isApproved: true,
  isShowGuaranteeText: true,
  isShowUserCount: true,
  randomNumberStart: 100,
  randomNumberEnd: 500,
  freeTrialPlan: true,
  showLifeTimeBannerAtHome: true,
  freeChoreLimit: 10,
  freeZoneLimit: 5,
  isForceUpdateRequired: false,
  minimumAppVersion: '1.0',
  showForceUpdateAlert: false,
  isShowInactivityNotification: true,
  inactivityDays1: 1,
  inactivityDays2: 7,
  inactivityDays3: 30,
  inactivityNotificationTitle: 'We miss you! 🐰',
  inactivityNotificationBody: 'Your chores are waiting. Come back and stay on top of things!',
};

/** iOS `RemoteConfigManager.isVersion(_:olderThan:)`: numeric, component-wise compare. */
export function isVersionOlder(current: string, minimum: string) {
  const left = current.split('.').map(part => Number(part) || 0);
  const right = minimum.split('.').map(part => Number(part) || 0);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a !== b) return a < b;
  }
  return false;
}

const DAY_MS = 86_400_000;

/** Local calendar day, so "the day changed" means the user's midnight, not UTC's. */
const dayKey = (ms: number) => {
  const date = new Date(ms);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

/** Reads whatever Remote Config currently has active — defaults, or the last activated fetch. */
function readConfig(rc: ReturnType<typeof remoteConfig>): PaywallConfig {
  const minimumAppVersion = rc.getString('minimumAppVersion') || defaults.minimumAppVersion;
  return {
    isShowOnboardingPaywall: rc.getBoolean('isShowOnboardingPaywall'),
    isShowGiftPaywall: rc.getBoolean('isShowGiftPaywall'),
    isShowPaywallCloseButton: rc.getBoolean('isShowPaywallCloseButton'),
    isShowDelayPaywallCloseButton: rc.getBoolean('isShowDelayPaywallCloseButton'),
    closeButtonDelayTime: rc.getNumber('closeButtonDelayTime'),
    defaultSubscriptionPlan: rc.getNumber('defaultSubscriptionPlan'),
    isShowDiscountPercentage: rc.getBoolean('isShowDiscountPercentage'),
    discountPercentage: rc.getNumber('discountPercentage'),
    isApproved: rc.getBoolean('isApproved'),
    isShowGuaranteeText: rc.getBoolean('isShowGuaranteeText'),
    isShowUserCount: rc.getBoolean('isShowUserCount'),
    randomNumberStart: rc.getNumber('randomNumberStart'),
    randomNumberEnd: rc.getNumber('randomNumberEnd'),
    freeTrialPlan: rc.getBoolean('freeTrialPlan'),
    showLifeTimeBannerAtHome: rc.getBoolean('showLifeTimeBannerAtHome'),
    freeChoreLimit: rc.getNumber('freeChoreLimit'),
    freeZoneLimit: rc.getNumber('freeZoneLimit'),
    isForceUpdateRequired: rc.getBoolean('isForceUpdateRequired'),
    minimumAppVersion,
    showForceUpdateAlert: rc.getBoolean('isForceUpdateRequired') && isVersionOlder(appVersion, minimumAppVersion),
    isShowInactivityNotification: rc.getBoolean('isShowInactivityNotification'),
    inactivityDays1: rc.getNumber('inactivityDays1'),
    inactivityDays2: rc.getNumber('inactivityDays2'),
    inactivityDays3: rc.getNumber('inactivityDays3'),
    inactivityNotificationTitle: rc.getString('inactivityNotificationTitle') || defaults.inactivityNotificationTitle,
    inactivityNotificationBody: rc.getString('inactivityNotificationBody') || defaults.inactivityNotificationBody,
  };
}

/**
 * Fetch policy: at most ONE network fetch per 24 hours, the cached values reused in
 * between, plus one forced fetch on the first app open of a new calendar day.
 *
 * Split in two on purpose. `primeRemoteConfig` is entirely LOCAL — settings,
 * defaults, and activating whatever the SDK already has on disk — so the app can
 * render its real configuration on the first frame instead of rendering in-app
 * defaults and correcting itself a moment later. `refreshRemoteConfig` is the part
 * that can touch the network, and it only does so when a fetch is actually due.
 *
 * `minimumFetchIntervalMillis: DAY_MS` enforces the 24-hour cap; the day-change
 * refetch has to bypass it with `fetch(0)`, because a day boundary can fall well
 * short of 24 hours since the last fetch (a fetch at 23:50, an open at 08:00).
 *
 * `fetchTimeMillis` is the SDK's own persisted timestamp of the last SUCCESSFUL
 * fetch (`-1` on Android / `0` on iOS when there has never been one), so no
 * AsyncStorage bookkeeping is needed and nothing can drift out of sync with the
 * SDK's own throttle.
 */
async function primeRemoteConfig(): Promise<PaywallConfig> {
  const rc = remoteConfig();
  await rc.setConfigSettings({ minimumFetchIntervalMillis: __DEV__ ? 0 : DAY_MS });
  await rc.setDefaults({ ...defaults });
  try { await rc.activate(); } catch (error) { if (__DEV__) console.warn('[RemoteConfig] activate failed', error); }
  return readConfig(rc);
}

/** Returns the refreshed values, or null when no fetch was due (or it failed). */
async function refreshRemoteConfig(): Promise<PaywallConfig | null> {
  const rc = remoteConfig();
  const lastFetch = rc.fetchTimeMillis;
  const neverFetched = !lastFetch || lastFetch <= 0;
  const dayChanged = !neverFetched && dayKey(lastFetch) !== dayKey(Date.now());
  // A fresh install has nothing but defaults, so that first fetch is not optional.
  if (!neverFetched && !dayChanged && !__DEV__) return null;
  try {
    await rc.fetch(0);
    await rc.activate();
    return readConfig(rc);
  } catch (error) {
    // Offline: the primed values are the previously activated ones, which is
    // exactly what should be reused.
    if (__DEV__) console.warn('[RemoteConfig] fetch failed', error);
    return null;
  }
}

/** Shallow compare so a foreground refresh that changed nothing does not re-render. */
const sameConfig = (a: PaywallConfig, b: PaywallConfig) =>
  (Object.keys(defaults) as (keyof PaywallConfig)[]).every(key => a[key] === b[key]);

/**
 * `ready` is false until the on-disk configuration has been read.
 *
 * iOS does not need this: `RemoteConfigManager` reads the SDK's cached values
 * synchronously in its initialiser, so every view sees the real configuration on
 * its first render. On Android the same read is an async native round-trip, so
 * anything whose visibility depends on a flag must wait for it — otherwise it
 * renders under the in-app defaults first and then corrects itself, which is what
 * made the gift banner appear and then vanish.
 */
export type PaywallConfigValue = PaywallConfig & { ready: boolean };

const Context = createContext<PaywallConfigValue>({ ...defaults, ready: false });

/**
 * ONE Remote Config instance for the whole app — iOS's single
 * `@StateObject RemoteConfigManager` injected with `.environmentObject`.
 *
 * This used to be a plain hook, so all eight call sites (`App`'s gate, Settings,
 * the tab bar, Zone, Zone Detail, the paywall, and BOTH gift banners) each held
 * their OWN `useState(defaults)` and settled independently. That is what produced
 * the reported flicker: Settings' copy had already loaded
 * `showLifeTimeBannerAtHome: false` — so it rendered the banner — while the
 * banner's own copy was still on the default `true`, so it drew the countdown
 * pill. As each copy settled they contradicted each other one at a time: pill
 * disappears, then the banner disappears.
 */
export function PaywallConfigProvider({ children }: React.PropsWithChildren) {
  const [config, setConfig] = useState<PaywallConfig>(defaults);
  const [ready, setReady] = useState(false);

  const apply = useCallback((next: PaywallConfig | null, alive: () => boolean) => {
    if (!next || !alive()) return;
    setConfig(current => (sameConfig(current, next) ? current : next));
  }, []);

  useEffect(() => {
    let mounted = true;
    const alive = () => mounted;

    void (async () => {
      // `ready` gates the root LoadingScreen, so it must flip even if Remote Config
      // is unavailable — otherwise a failure here strands the app on the splash.
      try {
        apply(await primeRemoteConfig(), alive);
      } catch (error) {
        if (__DEV__) console.warn('[RemoteConfig] prime failed, using in-app defaults', error);
      } finally {
        if (alive()) setReady(true);
      }
      apply(await refreshRemoteConfig(), alive);
    })();

    // iOS re-reads on every appear; here the check is cheap and only reaches the
    // network when the calendar day has rolled over since the last fetch.
    const subscription = AppState.addEventListener('change', async state => {
      if (state === 'active') apply(await refreshRemoteConfig(), alive);
    });
    return () => { mounted = false; subscription.remove(); };
  }, [apply]);

  const value = useMemo<PaywallConfigValue>(() => ({ ...config, ready }), [config, ready]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePaywallConfig() { return useContext(Context); }
