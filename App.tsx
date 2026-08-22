import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/services/AuthProvider';
import { HouseholdProvider, useHousehold } from '@/services/HouseholdContext';
import { ChoreProvider } from '@/services/ChoreContext';
import { MissedEventBackfill } from '@/services/MissedEventBackfill';
import { NotificationSync } from '@/services/NotificationSync';
import { OnboardingView } from '@/screens/onboarding/OnboardingView';
import { PaywallView } from '@/screens/PaywallView';
import { GiftPaywallView } from '@/screens/GiftPaywallView';
import { SignInView } from '@/screens/SignInView';
import { RootStack } from '@/navigation/RootStack';
import { HouseholdSetupNavigator } from '@/screens/household/HouseholdSetupNavigator';
import { NotificationPermissionView } from '@/screens/NotificationPermissionView';
import { colors } from '@/theme';
import { PurchaseProvider, usePurchases } from '@/services/PurchaseManager';

function Gate() {
  const app = useApp();
  const auth = useAuth();
  const household = useHousehold();
  const purchases = usePurchases();
  if (!app.hydrated || auth.loading) return <View style={styles.loading}><ActivityIndicator color={colors.purple} /></View>;
  if (!app.onboardingDone) return <OnboardingView onDone={() => app.setOnboardingDone(true)} />;
  if (!purchases.hasLoadedInitialStatus) return <View style={styles.loading}><ActivityIndicator color={colors.purple} /></View>;
  if (!app.paywallDone && !purchases.hasPro) return <PaywallView onClose={() => { app.setPaywallDone(true); app.setGiftPending(true); }} onPurchased={() => { app.setPaywallDone(true); app.setGiftPending(false); }} />;
  if (app.giftPending && !purchases.hasPro) return <GiftPaywallView onClose={() => app.setGiftPending(false)} onPurchased={() => app.setGiftPending(false)} />;
  if (!auth.user) return <SignInView onGoogle={() => { void auth.signInGoogle(); }} />;
  if (household.loadState === 'unknown' || household.loadState === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.purple} /></View>;
  if (household.loadState === 'noHousehold') return <NavigationContainer><HouseholdSetupNavigator /></NavigationContainer>;
  if (!app.notificationDone) return <NotificationPermissionView onFinish={() => app.setNotificationDone(true)} />;
  return <NavigationContainer><RootStack /></NavigationContainer>;
}

export default function App() {
  const [loaded] = useFonts({
    'SFProRounded-Ultralight': require('./assets/fonts/SF-Pro-Rounded-Ultralight.otf'), 'SFProRounded-Thin': require('./assets/fonts/SF-Pro-Rounded-Thin.otf'), 'SFProRounded-Light': require('./assets/fonts/SF-Pro-Rounded-Light.otf'), 'SFProRounded-Regular': require('./assets/fonts/SF-Pro-Rounded-Regular.otf'), 'SFProRounded-Medium': require('./assets/fonts/SF-Pro-Rounded-Medium.otf'), 'SFProRounded-Semibold': require('./assets/fonts/SF-Pro-Rounded-Semibold.otf'), 'SFProRounded-Bold': require('./assets/fonts/SF-Pro-Rounded-Bold.otf'), 'SFProRounded-Heavy': require('./assets/fonts/SF-Pro-Rounded-Heavy.otf'), 'SFProRounded-Black': require('./assets/fonts/SF-Pro-Rounded-Black.otf'),
  });
  if (!loaded) return null;
  return <SafeAreaProvider><StatusBar style="dark" translucent backgroundColor="transparent" /><AppProvider><PurchaseProvider><AuthProvider><HouseholdProvider><ChoreProvider><MissedEventBackfill /><NotificationSync /><Gate /></ChoreProvider></HouseholdProvider></AuthProvider></PurchaseProvider></AppProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background } });
