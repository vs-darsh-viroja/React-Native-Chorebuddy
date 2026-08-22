import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { screen } from '@/theme';

/**
 * iOS `MultiImageSlider` (paywall hero). The next image sits underneath at full
 * size while the current image on top is wiped away by a shrinking mask with
 * alternating direction. iOS effective timings with the paywall's parameters
 * (slideDuration 0.45 × 1.8 × 0.95, pauseDuration 0.12 × 1.6 × 0.95): slide
 * ≈770ms ease-in-out, pause ≈182ms, plus a 1.1s autoreversing 3.5% zoom pulse
 * on both layers.
 */
export function MultiImageSlider({ images, height }: { images: ImageSourcePropType[]; height: number }) {
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1);
  const [right, setRight] = useState(true);
  const wipe = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const currentRef = useRef(0);
  const nextRef = useRef(1);
  const rightRef = useRef(true);

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(zoom, { toValue: 1.035, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(zoom, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [zoom]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const slide = () => {
      Animated.timing(wipe, { toValue: 1, duration: 770, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start(({ finished }) => {
        if (!finished || stopped) return;
        // Pause FIRST, swap after. During the pause the mask is collapsed and
        // the base layer shows `images[next]` — the image that just slid in —
        // which is correct only while the indices are still the old ones.
        // Swapping at completion (the previous behavior) made the base layer
        // show the image AFTER next for the whole pause: a flash every cycle.
        timer = setTimeout(() => {
          if (stopped) return;
          currentRef.current = nextRef.current;
          nextRef.current = (nextRef.current + 1) % images.length;
          rightRef.current = !rightRef.current;
          // Swap, mask reset, and relaunch in one JS tick: "old state + wipe 1"
          // and "new state + wipe 0" paint identical pixels, so no intermediate
          // frame is visible.
          setCurrent(currentRef.current);
          setNext(nextRef.current);
          setRight(rightRef.current);
          wipe.setValue(0);
          slide();
        }, 182);
      });
    };
    wipe.setValue(0);
    slide();
    return () => { stopped = true; if (timer) clearTimeout(timer); wipe.stopAnimation(); };
  }, [images.length, wipe]);

  /**
   * iOS: `.aspectRatio(contentMode: .fill).frame(..., alignment: .top).clipped()`
   * — top-anchored fill, cropping the bottom. RN `cover` center-crops instead,
   * which cuts the artwork's baked-in bottom fade, so the fill is computed
   * explicitly from the asset's dimensions.
   */
  const fill = (source: ImageSourcePropType) => {
    const asset = Image.resolveAssetSource(source as number);
    const scale = Math.max(screen.width / asset.width, height / asset.height);
    return { width: asset.width * scale, height: asset.height * scale, inset: (screen.width - asset.width * scale) / 2 };
  };
  const base = fill(images[next]);
  const top = fill(images[current]);
  const visibleWidth = wipe.interpolate({ inputRange: [0, 1], outputRange: [screen.width, 0] });

  return (
    <View style={[styles.root, { height }]}>
      <Animated.Image source={images[next]} resizeMode="stretch" style={[styles.image, { left: base.inset, width: base.width, height: base.height, transform: [{ scale: zoom }] }]} />
      <Animated.View style={[styles.mask, { height, width: visibleWidth }, right ? styles.left : styles.right]}>
        <Animated.Image
          source={images[current]}
          resizeMode="stretch"
          // The image is horizontally centered, so its left and right insets are
          // equal; anchoring to the mask's screen-fixed edge keeps it still
          // while the mask width animates.
          style={[styles.image, { width: top.width, height: top.height, transform: [{ scale: zoom }] }, right ? { left: top.inset } : { right: top.inset }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  image: { position: 'absolute', top: 0 },
  mask: { position: 'absolute', top: 0, overflow: 'hidden' },
  left: { left: 0 },
  right: { right: 0 },
});
