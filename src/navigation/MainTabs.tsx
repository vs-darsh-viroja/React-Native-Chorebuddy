import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Images } from '@/constants/assets';
import { MainScreen } from '@/screens/MainScreens';
import { HomeView } from '@/screens/HomeView';
import { ZoneView } from '@/screens/ZoneView';
import { ChartView } from '@/screens/ChartView';
import { StatsView } from '@/screens/StatsView';
import { colors, font, s } from '@/theme';
import type { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const tabs = [{ name: 'Home', icon: Images.homeIcon }, { name: 'Zone', icon: Images.zoneIcon }, { name: 'Chart', icon: Images.chartIcon }, { name: 'Stats', icon: Images.statsIcon }] as const;

function TabBar({ state, navigation }: BottomTabBarProps) {
  return <View style={styles.fade}><View style={styles.bar}>{tabs.map((tab, index) => { const active = state.index === index; return <Pressable key={tab.name} onPress={() => navigation.navigate(tab.name)} style={[styles.tab, active && styles.active]}><Image source={tab.icon} resizeMode="contain" style={[styles.icon, { tintColor: active ? 'white' : `${colors.text}66` }]} /><Text style={[styles.label, active && styles.labelActive]}>{tab.name}</Text></Pressable>; })}</View><Pressable style={styles.add} onPress={() => navigation.getParent()?.navigate('AddChore')}><Image source={Images.plusIcon} resizeMode="contain" style={styles.plus} /></Pressable></View>;
}
export function MainTabs() { return <Tab.Navigator tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}><Tab.Screen name="Home" component={HomeView} /><Tab.Screen name="Zone" component={ZoneView} /><Tab.Screen name="Chart" component={ChartView} /><Tab.Screen name="Stats" component={StatsView} /></Tab.Navigator>; }
const styles = StyleSheet.create({ fade: { position: 'absolute', left: s(20), right: s(20), bottom: s(33), flexDirection: 'row', gap: s(10), alignItems: 'center' }, bar: { width: s(265), height: s(60), borderRadius: s(30), backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingLeft: s(8), paddingRight: s(4), shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: s(6.55), shadowOffset: { width: 0, height: s(2) }, elevation: 6 }, tab: { width: s(60), height: s(54), borderRadius: s(26), alignItems: 'center', justifyContent: 'center', gap: s(2) }, active: { width: s(64), backgroundColor: colors.purple }, icon: { width: s(24), height: s(24) }, label: { ...font('medium', 10), color: `${colors.text}66` }, labelActive: { color: 'white' }, add: { width: s(60), height: s(60), borderRadius: s(30), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: s(3), shadowOffset: { width: 0, height: s(4) }, elevation: 7 }, plus: { width: s(28), height: s(28), tintColor: 'white' } });
