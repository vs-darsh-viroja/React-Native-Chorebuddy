import React, { useEffect } from 'react';
import { AppState as RNAppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/services/AuthProvider';
import { HouseholdProvider, useHousehold } from '@/services/HouseholdContext';
import { ChoreProvider } from '@/services/ChoreContext';
import { MissedEventBackfill } from '@/services/MissedEventBackfill';
import { NotificationSync, scheduleInactivityReminders } from '@/services/NotificationSync';
import { GiftTimerProvider } from '@/services/GiftTimer';
import { OnboardingView } from '@/screens/onboarding/OnboardingView';
import { PaywallView } from '@/screens/PaywallView';
import { GiftPaywallView } from '@/screens/GiftPaywallView';
import { SignInView } from '@/screens/SignInView';
import { RootStack } from '@/navigation/RootStack';
import { HouseholdSetupNavigator } from '@/screens/household/HouseholdSetupNavigator';
import { NotificationPermissionView } from '@/screens/NotificationPermissionView';
import { ForceUpdateView, LoadingScreen } from '@/screens/ForceUpdateView';
import { usePaywallConfig } from '@/services/PaywallConfig';
import { PurchaseProvider, usePurchases } from '@/services/PurchaseManager';

function Gate() {
  const app = useApp();
  const auth = useAuth();
  const household = useHousehold();
  const purchases = usePurchases();
  const config = usePaywallConfig();

  // iOS re-arms the inactivity nudges every time the app is backgrounded, so
  // they only ever fire for someone who has actually stopped opening the app.
  useEffect(() => {
    const subscription = RNAppState.addEventListener('change', next => {
      if (next !== 'background') return;
      void scheduleInactivityReminders({
        enabled: config.isShowInactivityNotification,
        days: [config.inactivityDays1, config.inactivityDays2, config.inactivityDays3],
        title: config.inactivityNotificationTitle,
        body: config.inactivityNotificationBody,
      });
    });
    return () => subscription.remove();
  }, [config]);

  // iOS gate order: force update -> onboarding -> paywall -> gift -> sign-in -> household -> notifications.
  if (config.showForceUpdateAlert) return <ForceUpdateView />;
  if (!app.hydrated || auth.loading) return <LoadingScreen />;
  if (!app.onboardingDone) return <OnboardingView onDone={() => app.setOnboardingDone(true)} />;
  if (!purchases.hasLoadedInitialStatus) return <LoadingScreen />;
  // iOS closes the onboarding paywall straight through to sign-in unless the gift
  // offer is enabled, in which case closing arms it.
  if (config.isShowOnboardingPaywall && !app.paywallDone && !purchases.hasPro) return <PaywallView onClose={() => { app.setPaywallDone(true); app.setGiftPending(config.isShowGiftPaywall && !purchases.hasPro); }} onPurchased={() => { app.setPaywallDone(true); app.setGiftPending(false); }} />;
  if (config.isShowGiftPaywall && app.giftPending && !purchases.hasPro) return <GiftPaywallView onClose={() => app.setGiftPending(false)} onPurchased={() => app.setGiftPending(false)} />;
  if (!auth.user) return <SignInView onGoogle={() => { void auth.signInGoogle(); }} />;
  if (household.loadState === 'unknown' || household.loadState === 'loading') return <LoadingScreen />;
  if (household.loadState === 'noHousehold') return <NavigationContainer><HouseholdSetupNavigator /></NavigationContainer>;
  if (!app.notificationDone) return <NotificationPermissionView onFinish={() => app.setNotificationDone(true)} />;
  return <NavigationContainer><RootStack /></NavigationContainer>;
}

export default function App() {
  const [loaded] = useFonts({
    'SFProRounded-Ultralight': require('./assets/fonts/SF-Pro-Rounded-Ultralight.otf'), 'SFProRounded-Thin': require('./assets/fonts/SF-Pro-Rounded-Thin.otf'), 'SFProRounded-Light': require('./assets/fonts/SF-Pro-Rounded-Light.otf'), 'SFProRounded-Regular': require('./assets/fonts/SF-Pro-Rounded-Regular.otf'), 'SFProRounded-Medium': require('./assets/fonts/SF-Pro-Rounded-Medium.otf'), 'SFProRounded-Semibold': require('./assets/fonts/SF-Pro-Rounded-Semibold.otf'), 'SFProRounded-Bold': require('./assets/fonts/SF-Pro-Rounded-Bold.otf'), 'SFProRounded-Heavy': require('./assets/fonts/SF-Pro-Rounded-Heavy.otf'), 'SFProRounded-Black': require('./assets/fonts/SF-Pro-Rounded-Black.otf'),
  });
  if (!loaded) return null;
  return <SafeAreaProvider><StatusBar style="dark" translucent backgroundColor="transparent" /><AppProvider><GiftTimerProvider><PurchaseProvider><AuthProvider><HouseholdProvider><ChoreProvider><MissedEventBackfill /><NotificationSync /><Gate /></ChoreProvider></HouseholdProvider></AuthProvider></PurchaseProvider></GiftTimerProvider></AppProvider></SafeAreaProvider>;
}
