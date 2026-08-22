import { useEffect, useState } from 'react';
import remoteConfig from '@react-native-firebase/remote-config';

export interface PaywallConfig {
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
}

const defaults: PaywallConfig = {
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
};

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
      });
    })();
    return () => { alive = false; };
  }, []);
  return config;
}
