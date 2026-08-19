import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Images } from '@/constants/assets';
import { AppButton } from '@/components/AppButton';
import { colors, font, isSmallDevice, s } from '@/theme';

const slides = [
  { image: Images.bunnyImg1, title: '', subtitle: '' },
  { image: Images.bunnyImg2, title: 'Keep Your\nHome Organized', subtitle: 'Manage every task by room, zone,\nand schedule.' },
  { image: Images.bunnyImg3, title: 'Create Zones\nfor Every Room', subtitle: 'Organize chores by living room, kitchen,\nbedroom, bathroom, and more.' },
  { image: Images.pinkCalendarImg, title: 'Never Miss\na Chore Again', subtitle: 'See what’s due today, overdue, or\ncoming up soon.' },
  { image: Images.bunnyImg4, title: 'Assign\nChores to Members', subtitle: 'Share tasks with family, roommates,\nor helpers.' },
  { image: Images.statsStreakMascot, title: 'Track Your Cleaning Progress', subtitle: 'View completed chores, pending tasks,\nand overdue work easily.' },
  { image: Images.bunnyHeartImg, title: '', subtitle: '' },
];

export function OnboardingView({ onDone }: { onDone(): void }) {
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => { reveal.setValue(0); Animated.spring(reveal, { toValue: 1, useNativeDriver: true, stiffness: 100, damping: 15, delay: 200 }).start(); }, [index, reveal]);
  const next = () => {
    if (index === slides.length - 1) return onDone();
    const nextIndex = index + 1;
    setIndex(nextIndex);
    scroll.current?.scrollTo({ x: width * nextIndex, animated: true });
  };
  return (
    <View style={styles.root}>
      <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}>
        {slides.map((slide, i) => <View key={i} style={[styles.slide, { width }]}><Image source={slide.image} resizeMode="contain" style={styles.hero} /></View>)}
      </ScrollView>
      <View style={styles.bottom}>
        <Animated.View style={{ opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
          <Text style={styles.title}>{slides[index].title}</Text>
          <Text style={styles.subtitle}>{slides[index].subtitle}</Text>
        </Animated.View>
        <View style={styles.dots}>{slides.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}</View>
        <AppButton title={index === 0 ? 'Get Started' : 'Continue'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  slide: { alignItems: 'center', paddingTop: s(isSmallDevice ? 45 : 70) },
  hero: { width: s(330), height: s(isSmallDevice ? 360 : 430) },
  bottom: { position: 'absolute', left: s(25), right: s(25), bottom: s(isSmallDevice ? 21 : 37), gap: s(17) },
  title: { ...font('bold', 26), color: colors.text, textAlign: 'center', minHeight: s(62) },
  subtitle: { ...font('regular', 17), color: `${colors.text}80`, textAlign: 'center', minHeight: s(50), marginTop: s(10) },
  dots: { height: s(5), flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: s(6) },
  dot: { width: s(5), height: s(5), borderRadius: s(3), backgroundColor: `${colors.purple}33` },
  dotActive: { width: s(15), borderRadius: s(100), backgroundColor: colors.purple },
});
