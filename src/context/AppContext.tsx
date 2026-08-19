import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AppState = {
  hydrated: boolean;
  onboardingDone: boolean;
  paywallDone: boolean;
  giftPending: boolean;
  notificationDone: boolean;
  setOnboardingDone(value: boolean): void;
  setPaywallDone(value: boolean): void;
  setGiftPending(value: boolean): void;
  setNotificationDone(value: boolean): void;
};

const Context = createContext<AppState | null>(null);
const keys = {
  onboarding: 'hasCompletedSwipeOnboarding',
  paywall: 'hasShownPaywall',
  gift: 'hasShownGiftPaywall',
  notification: 'hasShownNotificationPrompt',
};

export function AppProvider({ children }: React.PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [onboardingDone, setOnboarding] = useState(false);
  const [paywallDone, setPaywall] = useState(false);
  const [giftPending, setGift] = useState(false);
  const [notificationDone, setNotification] = useState(false);

  useEffect(() => {
    Promise.all(Object.values(keys).map(key => AsyncStorage.getItem(key))).then(values => {
      setOnboarding(values[0] === 'true');
      setPaywall(values[1] === 'true');
      setGift(values[2] === 'true');
      setNotification(values[3] === 'true');
      setHydrated(true);
    });
  }, []);

  const persist = (key: string, setter: (value: boolean) => void) => (value: boolean) => {
    setter(value);
    void AsyncStorage.setItem(key, String(value));
  };

  const value = useMemo(() => ({
    hydrated,
    onboardingDone,
    paywallDone,
    giftPending,
    notificationDone,
    setOnboardingDone: persist(keys.onboarding, setOnboarding),
    setPaywallDone: persist(keys.paywall, setPaywall),
    setGiftPending: persist(keys.gift, setGift),
    setNotificationDone: persist(keys.notification, setNotification),
  }), [hydrated, onboardingDone, paywallDone, giftPending, notificationDone]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
