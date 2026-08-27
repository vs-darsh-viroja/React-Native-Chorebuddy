import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { CircleButton, PressScale } from '@/components/motion';
import { GiftBanner } from '@/components/GiftBanner';
import { useAuth } from '@/services/AuthProvider';
import { useChores } from '@/services/ChoreContext';
import { useHousehold } from '@/services/HouseholdContext';
import { notificationKey, syncNotifications } from '@/services/NotificationSync';
import { usePaywallConfig } from '@/services/PaywallConfig';
import { usePurchases } from '@/services/PurchaseManager';
import { useScreenTracking } from '@/services/Analytics';
import { AppConstant } from '@/constants/AppConstant';
import { openInAppBrowser } from '@/services/Browser';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AppImage } from '@/components/AppImage';

/** iOS `ModernToggleStyle`: 41×24 capsule with a 20pt knob inset 2pt, spring(response .3, damping .7). */
function ModernToggle({ value, onValueChange }: { value: boolean; onValueChange(next: boolean): void }) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    const stiffness = (2 * Math.PI / 0.3) ** 2;
    Animated.spring(progress, { toValue: value ? 1 : 0, stiffness, damping: 2 * 0.7 * Math.sqrt(stiffness), mass: 1, useNativeDriver: false }).start();
  }, [value, progress]);
  return (
    <Pressable onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.track, { backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [`${colors.text}33`, colors.purple] }) }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, s(17)] }) }] }]} />
      </Animated.View>
    </Pressable>
  );
}

/** iOS `SettingsView`: Try Pro banner, notification toggle, Members, feedback/support cards, and the log out / leave / delete actions. */
export function SettingsView({ navigation }: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  const auth = useAuth();
  const household = useHousehold();
  const store = useChores();
  const purchases = usePurchases();
  const config = usePaywallConfig();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => { void AsyncStorage.getItem(notificationKey).then(value => setEnabled(value === 'true')); }, []);

  /** iOS `handleNotificationToggle`: request when undetermined, alert to open system settings when denied, otherwise persist and rebuild schedules. */
  const toggleNotifications = async (next: boolean) => {
    if (!next) {
      void Haptics.selectionAsync();
      setEnabled(false);
      await AsyncStorage.setItem(notificationKey, 'false');
      await syncNotifications(store.chores);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && current.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      setEnabled(requested.granted);
      await AsyncStorage.setItem(notificationKey, String(requested.granted));
      await syncNotifications(store.chores);
      return;
    }
    if (!current.granted) {
      setEnabled(false);
      await AsyncStorage.setItem(notificationKey, 'false');
      Alert.alert('Enable Notifications', 'Notifications are turned off. Turn them on in Settings to get chore reminders.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void Linking.openSettings(); } },
      ]);
      return;
    }
    setEnabled(true);
    await AsyncStorage.setItem(notificationKey, 'true');
    await syncNotifications(store.chores);
  };

  const restore = async () => {
    const result = await purchases.restore();
    if (result.hasPro) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert('Restore Purchase', result.hasPro ? 'Your ChoreBuddy Pro subscription was restored.' : result.error ?? 'No active Google Play subscription was found.');
  };

  const confirmLogout = () => Alert.alert('Log Out', "You'll need to sign in again to access your household.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log Out', style: 'destructive', onPress: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void auth.signOut(); } },
  ]);
  const confirmLeave = () => Alert.alert(household.leaveDeletesHousehold ? 'Delete Household' : 'Leave Household', household.leaveMessage, [
    { text: 'Cancel', style: 'cancel' },
    { text: household.leaveDeletesHousehold ? 'Delete' : 'Leave', style: 'destructive', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); void household.leaveHousehold(); } },
  ]);
  const confirmDeleteAccount = () => Alert.alert('Delete Account', "This permanently deletes your account and data. This action can't be undone.", [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void auth.deleteAccount().catch(error => Alert.alert('Something Went Wrong', error instanceof Error ? error.message : String(error))); } },
  ]);

  const version = AppConstant.appVersionLabel;
  useScreenTracking('Settings');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerButtons}>
          <CircleButton onPress={() => navigation.goBack()}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.backIcon} />
          </CircleButton>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!purchases.hasPro && !config.showLifeTimeBannerAtHome && <GiftBanner />}

        {!purchases.hasPro && (
          <PressScale onPress={() => navigation.push('Paywall')} style={styles.proBanner}>
            <View style={styles.proCopy}>
              <Text style={styles.proTitle}>Access all features</Text>
              <Text style={styles.proSubtitle}>Upgrade to pro</Text>
            </View>
            <AppImage source={Images.tryProBadge} resizeMode="stretch" style={styles.proBadge} />
          </PressScale>
        )}

        <Card padding={12}>
          <Row icon={Images.notificationIcon} title="Notification" tail={<ModernToggle value={enabled} onValueChange={next => { void toggleNotifications(next); }} />} />
        </Card>

        <Card padding={14}>
          <Row icon={Images.membersIcon} title="Members" onPress={() => navigation.push('Members')} tail={<AppImage source={Images.chevronIcon} resizeMode="contain" style={styles.chevron} />} />
        </Card>

        <Card padding={12}>
          <Row icon={Images.rateUsIcon} title="Rate Us" onPress={() => { void Linking.openURL(AppConstant.ratingPopupURL).catch(() => Linking.openURL(AppConstant.shareAppIDURL)); }} />
          <Divider />
          <Row icon={Images.shareAppIcon} title="Share App" onPress={() => void Share.share({ message: `Keep your home organized with ChoreBuddy. ${AppConstant.shareAppIDURL}` })} />
          <Divider />
          <Row icon={Images.aboutIcon} title="About App" value={version} />
        </Card>

        <Card padding={12}>
          {!purchases.hasPro && (
            <>
              <Row icon={Images.restoreIcon} title="Restore Purchase" onPress={() => { void restore(); }} />
              <Divider />
            </>
          )}
          <Row icon={Images.contactUsIcon} title="Contact Us" onPress={() => void Linking.openURL(AppConstant.supportMailto('Contact Us', auth.user?.uid ?? '-'))} />
          <Divider />
          <Row icon={Images.privacyIcon} title="Privacy Policies" onPress={() => void openInAppBrowser(AppConstant.privacyURL)} />
          <Divider />
          <Row icon={Images.termsIcon} title="Terms & Conditions" onPress={() => void openInAppBrowser(AppConstant.termsAndConditionURL)} />
        </Card>

        <Card padding={14}><Row icon={Images.logoutIcon} title="Log Out" onPress={confirmLogout} /></Card>
        <Card padding={14}><Row icon={Images.LeaveIcon} title="Leave Household" titleColor={colors.purple} fullOpacityIcon onPress={confirmLeave} /></Card>
        <Card padding={14}><Row icon={Images.deleteIcon} title="Delete Account" titleColor="#FF6262" fullOpacityIcon svg onPress={confirmDeleteAccount} /></Card>
      </ScrollView>
    </View>
  );
}

function Card({ children, padding }: { children: React.ReactNode; padding: number }) {
  return <View style={[styles.card, { paddingVertical: s(padding) }]}>{children}</View>;
}

function Divider() {
  return <View style={styles.cardDivider} />;
}

function Row({ icon, title, onPress, tail, value, titleColor, fullOpacityIcon, svg }: { icon: any; title: string; onPress?(): void; tail?: React.ReactNode; value?: string; titleColor?: string; fullOpacityIcon?: boolean; svg?: boolean }) {
  const Glyph = icon;
  // Some catalog entries are SVG components and some are PNG asset ids. Passing
  // a component to `<Image source>` renders NOTHING — that is how the Log Out
  // icon went missing — so detect it here instead of relying on every call site
  // remembering the `svg` flag.
  const isGlyph = svg ?? (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon));
  const content = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, !fullOpacityIcon && { opacity: 0.5 }]}>
        {isGlyph ? <Glyph width={s(22)} height={s(22)} /> : <AppImage source={icon} resizeMode="contain" style={styles.rowIconImage} />}
      </View>
      <Text style={[styles.rowTitle, titleColor ? { color: titleColor } : null]}>{title}</Text>
      <View style={styles.spacer} />
      {value !== undefined ? <Text style={styles.rowValue}>{value}</Text> : tail}
    </View>
  );
  if (!onPress) return content;
  return <PressScale onPress={onPress} style={styles.rowPress}>{content}</PressScale>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: s(59), paddingHorizontal: s(15), height: s(99), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...font('semibold', 22), color: colors.text },
  headerButtons: { position: 'absolute', top: s(59), left: s(15), right: s(15), flexDirection: 'row' },
  backIcon: { width: s(22), height: s(22) },
  content: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(60), gap: s(15) },
  proBanner: { height: s(68), borderRadius: s(16), backgroundColor: colors.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(16) },
  proCopy: { gap: s(3) },
  proTitle: { ...font('medium', 16), color: colors.white },
  proSubtitle: { ...font('regular', 12), color: '#FFFFFFCC' },
  proBadge: { width: s(104), height: s(35) },
  card: { borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(4), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  cardDivider: { height: 1, backgroundColor: `${colors.text}14`, marginVertical: s(12) },
  rowPress: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingHorizontal: s(15) },
  rowIcon: { width: s(22), height: s(22), alignItems: 'center', justifyContent: 'center' },
  rowIconImage: { width: s(22), height: s(22) },
  rowTitle: { ...font('regular', 14), color: colors.text },
  spacer: { flex: 1 },
  rowValue: { ...font('regular', 12), color: `${colors.text}80` },
  chevron: { width: s(16), height: s(16), opacity: 0.5 },
  track: { width: s(41), height: s(24), borderRadius: s(12), padding: s(2), justifyContent: 'center' },
  knob: { width: s(20), height: s(20), borderRadius: s(10), backgroundColor: colors.white },
});
