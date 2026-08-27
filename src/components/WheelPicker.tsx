import React, { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, font, s } from '@/theme';

const ITEM_HEIGHT = 40;
const VISIBLE = 5;

/**
 * A single snapping wheel column. iOS uses `DatePicker(.wheel)`, which Android
 * has no equivalent for — the platform picker is a clock dialog — so the wheel
 * is rebuilt here to keep the sheet visually identical.
 */
function WheelColumn({ values, index, onChange, width }: { values: string[]; index: number; onChange(next: number): void; width: number }) {
  const scroller = useRef<ScrollView>(null);
  const lastIndex = useRef(index);
  const itemHeight = s(ITEM_HEIGHT);

  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.max(0, Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / itemHeight)));
    if (next !== lastIndex.current) {
      lastIndex.current = next;
      void Haptics.selectionAsync();
      onChange(next);
    }
  };

  return (
    <View style={{ width, height: itemHeight * VISIBLE }}>
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        // REQUIRED on Android: a vertical ScrollView nested inside another one
        // never receives the drag without this — the parent keeps the gesture,
        // which is why the interval/unit wheels inside Add Chore's step scroll
        // (and the sheet wheels) would not spin at all.
        nestedScrollEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: index * itemHeight }}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        contentContainerStyle={{ paddingVertical: itemHeight * ((VISIBLE - 1) / 2) }}
      >
        {values.map((value, valueIndex) => (
          <View key={value} style={[styles.item, { height: itemHeight }]}>
            <Text style={[styles.itemText, valueIndex === index ? styles.itemTextOn : null]}>{value}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

/** iOS wheel time picker: 12-hour, minute, AM/PM with the centred selection band. */
export function TimeWheel({ date, onChange }: { date: Date; onChange(next: Date): void }) {
  const hour24 = date.getHours();
  const hourIndex = (hour24 % 12 === 0 ? 12 : hour24 % 12) - 1;
  const minuteIndex = date.getMinutes();
  const periodIndex = hour24 >= 12 ? 1 : 0;

  const apply = (nextHourIndex: number, nextMinute: number, nextPeriod: number) => {
    const next = new Date(date);
    const hour12 = nextHourIndex + 1;
    const hours = (hour12 % 12) + (nextPeriod === 1 ? 12 : 0);
    next.setHours(hours, nextMinute, 0, 0);
    onChange(next);
  };

  const columnWidth = useMemo(() => s(80), []);

  return (
    <View style={styles.wheel}>
      <View style={[styles.band, { height: s(ITEM_HEIGHT) }]} pointerEvents="none" />
      <WheelColumn values={HOURS} index={hourIndex} width={columnWidth} onChange={next => apply(next, minuteIndex, periodIndex)} />
      <WheelColumn values={MINUTES} index={minuteIndex} width={columnWidth} onChange={next => apply(hourIndex, next, periodIndex)} />
      <WheelColumn values={PERIODS} index={periodIndex} width={columnWidth} onChange={next => apply(hourIndex, minuteIndex, next)} />
    </View>
  );
}

/** iOS `Menu`-backed number/unit pickers in the Custom repeat block. */
export function InlineWheel({ values, index, onChange, width }: { values: string[]; index: number; onChange(next: number): void; width: number }) {
  return (
    <View style={styles.inlineWrap}>
      <View style={[styles.band, { height: s(ITEM_HEIGHT) }]} pointerEvents="none" />
      <WheelColumn values={values} index={index} width={width} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  inlineWrap: { alignItems: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: s(ITEM_HEIGHT) * 2, borderRadius: s(10), backgroundColor: `${colors.purple}14` },
  item: { alignItems: 'center', justifyContent: 'center' },
  itemText: { ...font('regular', 20), color: `${colors.text}66` },
  itemTextOn: { ...font('semibold', 22), color: colors.text },
});
