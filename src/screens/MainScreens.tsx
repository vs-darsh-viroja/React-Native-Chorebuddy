import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Images } from '@/constants/assets';
import { colors, font, s } from '@/theme';

const config = {
  Home: { title: 'Home', image: Images.emptyImg, heading: 'Your Home, Ready for a Fresh Start', body: 'Add your first chore and keep every space clean, organized, and stress-free.' },
  Zone: { title: 'Zone', image: Images.memberEmpty, heading: 'Organize Every Space', body: 'Create zones for the rooms and areas you care for.' },
  Chart: { title: 'Chores Chart', image: Images.overviewMascot, heading: 'No Chores Scheduled', body: 'Enjoy your free time or add one to stay organized.' },
  Stats: { title: 'Stats & Progress', image: Images.statsEmptyImg, heading: 'No Progress Yet', body: 'Complete your first chore to unlock streaks, achievements, and cleaning insights.' },
} as const;

export function MainScreen({ kind }: { kind: keyof typeof config }) {
  const item = config[kind];
  return <View style={styles.root}><Image source={Images.appBg} style={StyleSheet.absoluteFill} resizeMode="cover" /><Text style={styles.title}>{item.title}</Text><ScrollView contentContainerStyle={styles.content}><View style={styles.glow} /><Image source={item.image} resizeMode="contain" style={styles.empty} /><Text style={styles.heading}>{item.heading}</Text><Text style={styles.body}>{item.body}</Text></ScrollView></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background, paddingTop: s(59) }, title: { ...font('semibold', 24), color: colors.text, paddingHorizontal: s(15) }, content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: s(130) }, glow: { position: 'absolute', width: s(144), height: s(144), borderRadius: s(72), backgroundColor: `${colors.purple}1F` }, empty: { width: s(145), height: s(170) }, heading: { ...font('semibold', 18), color: colors.text, marginTop: s(19), textAlign: 'center' }, body: { ...font('regular', 15), color: `${colors.text}99`, width: s(255), textAlign: 'center', marginTop: s(10) } });
