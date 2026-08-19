import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HouseholdSetupView } from './HouseholdSetupView';
import { CreateHouseholdView } from './CreateHouseholdView';
import { JoinHouseholdView } from './JoinHouseholdView';
import { MemberSelectView } from './MemberSelectView';
import type { Household, HouseholdMember } from '@/services/HouseholdContext';

export type SetupStack = { Choice: undefined; Create: undefined; Join: undefined; MemberSelect: { household: Household; members: HouseholdMember[] } };
const Stack = createNativeStackNavigator<SetupStack>();
export function HouseholdSetupNavigator() { return <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}><Stack.Screen name="Choice" component={HouseholdSetupView} /><Stack.Screen name="Create" component={CreateHouseholdView} /><Stack.Screen name="Join" component={JoinHouseholdView} /><Stack.Screen name="MemberSelect" component={MemberSelectView} /></Stack.Navigator>; }
