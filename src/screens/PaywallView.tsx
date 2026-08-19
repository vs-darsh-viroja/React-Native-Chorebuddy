import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Images } from '@/constants/assets';
import { AppButton } from '@/components/AppButton';
import { colors, font, s } from '@/theme';

const features = [
  ['point1', 'Unlimited Home Zones'],
  ['point2', 'Smart Chore Scheduling'],
  ['point3', 'Family Member Sharing'],
  ['point4', 'Advanced Progress Stats'],
] as const;

export function PaywallView({ onClose }: { onClose(): void }) {
  const [yearly, setYearly] = useState(true);
  const zoom = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(zoom, { toValue: 1.05, duration: 3500, useNativeDriver: true }), Animated.timing(zoom, { toValue: 1, duration: 3500, useNativeDriver: true })])).start(); }, [zoom]);
  return (
    <View style={styles.root}>
      <View style={styles.hero}><Animated.Image source={Images.pw1} resizeMode="cover" style={[styles.heroImage, { transform: [{ scale: zoom }] }]} /><LinearGradient colors={['transparent', colors.background]} style={StyleSheet.absoluteFill} /></View>
      <Pressable onPress={onClose} hitSlop={14} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      <View style={styles.content}>
        <Text style={styles.heading}>Go Chores Tracker PRO</Text>
        {features.map(([key, label]) => <View style={styles.feature} key={key}><Image source={Images[key]} style={styles.featureIcon} /><Text style={styles.featureLabel}>{label}</Text></View>)}
        <Pressable onPress={() => setYearly(true)} style={[styles.plan, yearly && styles.planSelected]}><View><Text style={styles.planTitle}>Yearly</Text><Text style={styles.planSub}>Only $0.58 per week</Text></View><View style={[styles.radio, yearly && styles.radioSelected]}>{yearly && <View style={styles.radioDot} />}</View><Text style={styles.save}>Save 85%</Text></Pressable>
        <Pressable onPress={() => setYearly(false)} style={[styles.plan, !yearly && styles.planSelected]}><View><Text style={styles.planTitle}>Weekly</Text><Text style={styles.planSub}>3-day free trial</Text></View><View style={[styles.radio, !yearly && styles.radioSelected]}>{!yearly && <View style={styles.radioDot} />}</View></Pressable>
        <AppButton title="Continue" onPress={onClose} />
        <Text style={styles.legal}>Privacy  |  Terms  ·  Cancel Anytime</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, hero: { height: s(310), overflow: 'hidden' }, heroImage: { width: '100%', height: '100%' },
  close: { position: 'absolute', right: s(18), top: s(52), width: s(30), height: s(30), borderRadius: s(15), backgroundColor: '#00000040', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFFAA' }, closeText: { color: 'white', fontSize: s(25), lineHeight: s(27) },
  content: { marginTop: s(-80), paddingHorizontal: s(25), gap: s(10) }, heading: { ...font('bold', 30), color: colors.text, textAlign: 'center', marginBottom: s(5) },
  feature: { flexDirection: 'row', alignItems: 'center', gap: s(12) }, featureIcon: { width: s(22), height: s(22) }, featureLabel: { ...font('medium', 14), color: colors.text },
  plan: { height: s(68), borderRadius: s(16), borderWidth: 1, borderColor: `${colors.text}1A`, backgroundColor: 'white', paddingHorizontal: s(15), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, planSelected: { borderColor: colors.purple, backgroundColor: `${colors.purple}14` },
  planTitle: { ...font('semibold', 15), color: colors.text }, planSub: { ...font('regular', 12), color: `${colors.text}80`, marginTop: s(3) }, radio: { width: s(20), height: s(20), borderRadius: s(10), borderWidth: s(1.5), borderColor: `${colors.text}55`, alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: colors.purple }, radioDot: { width: s(10), height: s(10), borderRadius: s(5), backgroundColor: colors.purple }, save: { position: 'absolute', right: s(12), top: s(-9), ...font('semibold', 10), color: colors.purple, backgroundColor: 'white', borderWidth: 1, borderColor: colors.purple, borderRadius: s(10), paddingHorizontal: s(8), paddingVertical: s(2) }, legal: { ...font('regular', 10), color: `${colors.text}80`, textAlign: 'center' },
});
