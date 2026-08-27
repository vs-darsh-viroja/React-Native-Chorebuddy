import { useEffect, useState } from 'react';
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

export function usePaywallConfig() {
  const [config, setConfig] = useState(defaults);
  useEffect(() => {
    let alive = true;
    const rc = remoteConfig();
    void (async () => {
      await rc.setConfigSettings({ minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000 });
      await rc.setDefaults({ ...defaults });
      try { await rc.fetchAndActivate(); } catch (error) { if (__DEV__) console.warn('[Paywall] Remote Config fetch failed', error); }
      if (!alive) return;
      setConfig({
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
        minimumAppVersion: rc.getString('minimumAppVersion') || defaults.minimumAppVersion,
        showForceUpdateAlert: rc.getBoolean('isForceUpdateRequired') && isVersionOlder(appVersion, rc.getString('minimumAppVersion') || defaults.minimumAppVersion),
        isShowInactivityNotification: rc.getBoolean('isShowInactivityNotification'),
        inactivityDays1: rc.getNumber('inactivityDays1'),
        inactivityDays2: rc.getNumber('inactivityDays2'),
        inactivityDays3: rc.getNumber('inactivityDays3'),
        inactivityNotificationTitle: rc.getString('inactivityNotificationTitle') || defaults.inactivityNotificationTitle,
        inactivityNotificationBody: rc.getString('inactivityNotificationBody') || defaults.inactivityNotificationBody,
      });
    })();
    return () => { alive = false; };
  }, []);
  return config;
}
