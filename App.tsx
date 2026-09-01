import React, { useCallback, useEffect, useState } from 'react';
import { AppState as RNAppState, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/services/AuthProvider';
import { HouseholdProvider, useHousehold } from '@/services/HouseholdContext';
import { ChoreProvider, useChores } from '@/services/ChoreContext';
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
import { KeyboardDoneBar } from '@/components/BottomSheet';
import { PaywallConfigProvider, usePaywallConfig } from '@/services/PaywallConfig';
import { PurchaseProvider, usePurchases } from '@/services/PurchaseManager';
import { useQuickActions } from '@/hooks/useQuickActions';

// Hold the native splash until `useFonts` resolves. Without this the RN root
// attaches while `App` still returns null, and anything opaque behind it can
// flash between the full-bleed launch window and the first painted screen.
// `AppTheme`'s windowBackground is the same artwork (plugins/withLaunchScreenFill.js),
// so the whole sequence is one continuous image.
SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const app = useApp();
  const auth = useAuth();
  const household = useHousehold();
  const chores = useChores();
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

  /**
   * iOS `ContentView` publishes the launcher quick actions on appear and on every
   * `hasPro` change, and routes a tap here rather than inside a screen.
   *
   * "Unlock your special offer" presents the gift paywall as a `fullScreenCover`
   * over whatever is on screen, so the Android equivalent is an overlay ABOVE the
   * gate's own content — not another branch of the gate, which would unmount the
   * navigator underneath it.
   */
  const [quickGift, setQuickGift] = useState(false);
  const giftGateShowing = config.isShowGiftPaywall && app.giftPending && !purchases.hasPro;
  // iOS: `guard !purchaseManager.hasPro, !shouldShowGiftPaywall else { return }`.
  const openQuickGift = useCallback(() => {
    if (purchases.hasPro || giftGateShowing) return;
    setQuickGift(true);
  }, [purchases.hasPro, giftGateShowing]);
  useQuickActions({
    hasPro: purchases.hasPro,
    userId: auth.user?.uid ?? '-',
    openGift: openQuickGift,
    ready: app.hydrated && !auth.loading,
  });

  // iOS gate order: force update -> onboarding -> paywall -> gift -> sign-in -> household -> notifications.
  function gateContent() {
    if (config.showForceUpdateAlert) return <ForceUpdateView />;
    // Remote Config decides three of the branches below (force update, onboarding
  // paywall, gift). iOS reads its cached values synchronously, so its gate is stable
  // from the first frame; here the read is async, so wait for it rather than deciding
  // on in-app defaults and re-deciding a frame later.
  if (!app.hydrated || auth.loading || !config.ready) return <LoadingScreen />;
    if (!app.onboardingDone) return <OnboardingView onDone={() => app.setOnboardingDone(true)} />;
    if (!purchases.hasLoadedInitialStatus) return <LoadingScreen />;
    // iOS closes the onboarding paywall straight through to sign-in unless the gift
    // offer is enabled, in which case closing arms it.
    if (config.isShowOnboardingPaywall && !app.paywallDone && !purchases.hasPro) return <PaywallView onClose={() => { app.setPaywallDone(true); app.setGiftPending(config.isShowGiftPaywall && !purchases.hasPro); }} onPurchased={() => { app.setPaywallDone(true); app.setGiftPending(false); }} />;
    if (config.isShowGiftPaywall && app.giftPending && !purchases.hasPro) return <GiftPaywallView onClose={() => app.setGiftPending(false)} onPurchased={() => app.setGiftPending(false)} />;
    if (!auth.user) return <SignInView onGoogle={() => { void auth.signInGoogle(); }} loading={auth.loadingProvider === 'google'} />;
    if (household.loadState === 'unknown' || household.loadState === 'loading') return <LoadingScreen />;
    if (household.loadState === 'noHousehold') return <NavigationContainer><HouseholdSetupNavigator /></NavigationContainer>;
    if (!app.notificationDone) return <NotificationPermissionView onFinish={() => app.setNotificationDone(true)} />;
    /*
     * Hold the splash until the chores listener has delivered its first snapshot.
     *
     * iOS binds `choreStore` from `ContentView.onAppear` and on every household-id
     * change — i.e. while `LoadingScreen` is still up — and by the time `MainView`
     * appears Firestore has served the local cache, so Home draws its real state
     * immediately. Android binds at the same moment (`ChoreProvider` keyed on
     * `household?.id`) but did not WAIT for that first snapshot, so Home rendered
     * its empty state for the ~1s the read took and then swapped to the data.
     * `ready` also flips on a listener error, so a rules rejection cannot strand
     * the app here.
     */
    if (!chores.ready) return <LoadingScreen />;
    return <NavigationContainer><RootStack /></NavigationContainer>;
  }

  return (
    <>
      {gateContent()}
      {quickGift && (
        <View style={StyleSheet.absoluteFill}>
          <GiftPaywallView isPermanentOffer onClose={() => setQuickGift(false)} onPurchased={() => setQuickGift(false)} />
        </View>
      )}
      {/* iOS enables `IQKeyboardManager`'s auto-toolbar globally in `SceneDelegate`,
          so every text field in the app gets a Done button above the keyboard.
          Mounted last so it also sits above any open sheet. */}
      <KeyboardDoneBar />
    </>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    'SFProRounded-Ultralight': require('./assets/fonts/SF-Pro-Rounded-Ultralight.otf'), 'SFProRounded-Thin': require('./assets/fonts/SF-Pro-Rounded-Thin.otf'), 'SFProRounded-Light': require('./assets/fonts/SF-Pro-Rounded-Light.otf'), 'SFProRounded-Regular': require('./assets/fonts/SF-Pro-Rounded-Regular.otf'), 'SFProRounded-Medium': require('./assets/fonts/SF-Pro-Rounded-Medium.otf'), 'SFProRounded-Semibold': require('./assets/fonts/SF-Pro-Rounded-Semibold.otf'), 'SFProRounded-Bold': require('./assets/fonts/SF-Pro-Rounded-Bold.otf'), 'SFProRounded-Heavy': require('./assets/fonts/SF-Pro-Rounded-Heavy.otf'), 'SFProRounded-Black': require('./assets/fonts/SF-Pro-Rounded-Black.otf'),
  });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;
  return <SafeAreaProvider><StatusBar style="dark" translucent backgroundColor="transparent" /><AppProvider><PaywallConfigProvider><GiftTimerProvider><PurchaseProvider><AuthProvider><HouseholdProvider><ChoreProvider><MissedEventBackfill /><NotificationSync /><Gate /></ChoreProvider></HouseholdProvider></AuthProvider></PurchaseProvider></GiftTimerProvider></PaywallConfigProvider></AppProvider></SafeAreaProvider>;
}
