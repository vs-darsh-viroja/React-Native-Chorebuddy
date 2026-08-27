import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Images } from '@/constants/assets';
import { PressScale } from '@/components/motion';
import { ProLimitPopup, type ProLimitKind } from '@/components/ProLimitPopup';
import { HomeView } from '@/screens/HomeView';
import { ZoneView } from '@/screens/ZoneView';
import { ChartView } from '@/screens/ChartView';
import { StatsView } from '@/screens/StatsView';
import { limitReached, useChores } from '@/services/ChoreContext';
import { Analytics } from '@/services/Analytics';
import { usePaywallConfig } from '@/services/PaywallConfig';
import { usePurchases } from '@/services/PurchaseManager';
import { useBottomBarHidden } from '@/services/BottomBar';
import { colors, font, s } from '@/theme';
import type { MainTabsParamList } from './types';
import { AppImage } from '@/components/AppImage';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const tabs = [
  { name: 'Home', icon: Images.homeIcon },
  { name: 'Zone', icon: Images.zoneIcon },
  { name: 'Chart', icon: Images.chartIcon },
  { name: 'Stats', icon: Images.statsIcon },
] as const;

const TAB_WIDTH = 60;
const PILL_WIDTH = 64;

/** iOS `BottomTabs`: a 265×60 white capsule with the sliding purple pill, the 60pt Add button, and the 183.5pt background scrim. */
function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // iOS `BottomTabs().opacity(appState.hideBottomBar ? 0 : 1)` — the bar hides
  // while a sheet is presented. `pointerEvents` goes with it: iOS's sheet is a
  // real presentation that swallows touches, whereas here the bar is a sibling
  // and an opacity-0 view would still take taps through the sheet.
  const barHidden = useBottomBarHidden();
  const store = useChores();
  const config = usePaywallConfig();
  const { hasPro } = usePurchases();
  const [limit, setLimit] = useState<ProLimitKind | null>(null);
  const pill = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    const stiffness = (2 * Math.PI / 0.35) ** 2;
    Animated.spring(pill, { toValue: state.index, stiffness, damping: 2 * 0.85 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
  }, [state.index, pill]);

  // iOS logs a screen view for the selected tab's title on appear and on change.
  useEffect(() => { Analytics.logScreen(state.routeNames[state.index]); }, [state.index, state.routeNames]);

  /** iOS `addChore()`: the central button checks the free chore limit first. */
  const onAdd = () => {
    if (limitReached(store.choreCreatedCount, config.freeChoreLimit, hasPro)) { setLimit('chore'); return; }
    navigation.getParent()?.navigate('AddChore');
  };

  return (
    <>
      <LinearGradient colors={[`${colors.background}00`, colors.background]} locations={[0, 0.59]} style={[styles.scrim, barHidden && styles.hidden]} pointerEvents="none" />
      {/* iOS offset is BottomTabs' 33 + MainView's extra 8 = 41 from the screen edge. */}
      <View pointerEvents={barHidden ? 'none' : 'auto'} style={[styles.row, { bottom: Math.max(s(41), insets.bottom + s(12)) }, barHidden && styles.hidden]}>
        <View style={styles.bar}>
          <Animated.View style={[styles.pill, { transform: [{ translateX: pill.interpolate({ inputRange: [0, 1], outputRange: [0, s(TAB_WIDTH + 3)] }) }] }]} />
          {tabs.map(tab => {
            const index = tabs.findIndex(item => item.name === tab.name);
            const active = state.index === index;
            return (
              <Pressable
                key={tab.name}
                onPress={() => { void Haptics.selectionAsync(); navigation.navigate(tab.name); }}
                style={styles.tab}
              >
                <AppImage source={tab.icon} resizeMode="contain" style={[styles.icon, { tintColor: active ? colors.white : colors.text, opacity: active ? 1 : 0.4 }]} />
                <Text style={[styles.label, { color: active ? colors.white : colors.text, opacity: active ? 1 : 0.4 }]}>{tab.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <PressScale haptic="medium" onPress={onAdd} style={styles.add}>
          <AppImage source={Images.plusIcon} resizeMode="contain" style={styles.plus} />
        </PressScale>
      </View>
      {limit && (
        <ProLimitPopup
          kind={limit}
          onUnlock={() => { setLimit(null); navigation.getParent()?.navigate('Paywall'); }}
          onClose={() => setLimit(null)}
        />
      )}
    </>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeView} />
      <Tab.Screen name="Zone" component={ZoneView} />
      <Tab.Screen name="Chart" component={ChartView} />
      <Tab.Screen name="Stats" component={StatsView} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: s(183.5) },
  row: { position: 'absolute', left: 0, right: 0, bottom: s(33), flexDirection: 'row', gap: s(10), alignItems: 'center', justifyContent: 'center' },
  bar: { width: s(265), height: s(60), borderRadius: s(30), backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', paddingLeft: s(8), gap: s(3), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(13.1), color: 'rgba(0,0,0,0.15)' }] },
  pill: { position: 'absolute', left: s(8) - s((PILL_WIDTH - TAB_WIDTH) / 2), width: s(PILL_WIDTH), height: s(54), borderRadius: s(26), backgroundColor: colors.purple, borderWidth: 0.5, borderColor: colors.white },
  tab: { width: s(TAB_WIDTH), height: s(54), alignItems: 'center', justifyContent: 'center', gap: s(2) },
  icon: { width: s(24), height: s(24) },
  // The gap token (2) already matches iOS `VStack(spacing: 2)` and the Figma
  // node (24 icon + 2 + 12 label = 38). What did NOT match was the rendered
  // box: without these two props Android adds ~4-5dp of font padding above
  // and below the label, which widened the visible icon-to-text gap and made
  // the taller stack sit tight to the top of the tab. Pinning the design's
  // real line box (10 x 1.193 = 11.9) restores the exact iOS spacing/centring.
  label: { ...font('medium', 10), lineHeight: s(11.9), includeFontPadding: false, letterSpacing: 0.2 },
  add: { width: s(60), height: s(60), borderRadius: s(30), backgroundColor: colors.purple, borderWidth: 1, borderColor: colors.white, alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: s(4), blurRadius: s(6), color: 'rgba(0,0,0,0.2)' }] },
  plus: { width: s(28), height: s(28), tintColor: colors.white },
});
