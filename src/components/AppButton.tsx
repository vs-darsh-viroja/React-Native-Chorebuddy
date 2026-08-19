import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, font, s } from '@/theme';

export function AppButton({ title, onPress }: { title: string; onPress(): void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: true, stiffness: 220, damping: 15, mass: 0.8 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => animate(0.92)}
        onPressOut={() => animate(1)}
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        style={styles.button}
      >
        <Text style={styles.label}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { height: s(52), borderRadius: s(100), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: s(5), shadowOffset: { width: 0, height: s(2) }, elevation: 4 },
  label: { ...font('semibold', 16), color: colors.white },
});
