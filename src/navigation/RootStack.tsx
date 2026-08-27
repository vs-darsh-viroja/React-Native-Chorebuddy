import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';
import { MainScreen } from '@/screens/MainScreens';
import { CreateZoneView } from '@/screens/CreateZoneView';
import { ZoneDetailView } from '@/screens/ZoneDetailView';
import { AddChoreView } from '@/screens/AddChoreView';
import { ChoreDetailView } from '@/screens/ChoreDetailView';
import { ChoreStatusView } from '@/screens/ChoreStatusView';
import { OverviewView } from '@/screens/OverviewView';
import { SettingsView } from '@/screens/SettingsView';
import { MembersView, MemberDetailView, EditProfileView } from '@/screens/MembersView';
import { PaywallView } from '@/screens/PaywallView';

const Stack = createNativeStackNavigator<RootStackParamList>();
function PaywallScreen({ navigation }: { navigation: { goBack(): void } }) { return <PaywallView onClose={() => navigation.goBack()} onPurchased={() => navigation.goBack()} />; }
export function RootStack() { return <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}><Stack.Screen name="Main" component={MainTabs} /><Stack.Screen name="Paywall" component={PaywallScreen} options={{ animation: 'slide_from_bottom' }} /><Stack.Screen name="Settings" component={SettingsView} /><Stack.Screen name="Members" component={MembersView} /><Stack.Screen name="MemberDetail" component={MemberDetailView} /><Stack.Screen name="EditProfile" component={EditProfileView} /><Stack.Screen name="AddChore" component={AddChoreView} options={{ animation: 'slide_from_bottom' }} /><Stack.Screen name="ZoneDetail" component={ZoneDetailView} /><Stack.Screen name="ChoreDetail" component={ChoreDetailView} /><Stack.Screen name="ChoreStatus" component={ChoreStatusView} /><Stack.Screen name="CreateZone" component={CreateZoneView} /><Stack.Screen name="Overview" component={OverviewView} /></Stack.Navigator>; }
