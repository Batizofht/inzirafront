import { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, Platform } from 'react-native';
import { Image } from 'expo-image';

interface Props {
  uri: string;
  /** Lets callers signal which image is shown so internal zoom can reset on change. */
  resetKey?: string | number;
}

/**
 * Pinch-to-zoom on native (PanResponder), wheel / double-click on desktop web,
 * and touch-pinch on mobile web browsers (iOS Safari, Chrome Android).
 */
export function ZoomableImage({ uri, resetKey }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Committed values (saved at end of each gesture)
  const savedScale = useRef(1);
  const savedX = useRef(0);
  const savedY = useRef(0);

  // Base values captured at gesture START (so dx/dy delta is always from 0)
  const baseScale = useRef(1);
  const baseX = useRef(0);
  const baseY = useRef(0);

  const lastDistance = useRef<number | null>(null);
  const lastTap = useRef(0);

  // Web uses plain state-driven transforms
  const [webScale, setWebScale] = useState(1);
  const webScaleRef = useRef(1);
  webScaleRef.current = webScale;
  // Tracks the pinch gesture start values for mobile-web touch events
  const webPinchRef = useRef<{ initialDist: number; initialScale: number } | null>(null);

  const [lastResetKey, setLastResetKey] = useState(resetKey);

  // Reset zoom whenever the displayed image changes
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    if (webScale !== 1) setWebScale(1);
  }

  const resetZoom = () => {
    savedScale.current = 1;
    savedX.current = 0;
    savedY.current = 0;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const getDistance = (touches: any[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        savedScale.current > 1 || Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,
      // Don't yield the gesture once we've claimed it — prevents outer Pressable from stealing
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        baseScale.current = savedScale.current;
        baseX.current = savedX.current;
        baseY.current = savedY.current;
        lastDistance.current = null;

        const now = Date.now();
        if (now - lastTap.current < 280) {
          resetZoom();
        }
        lastTap.current = now;
      },

      onPanResponderMove: (e, gs) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          const dist = getDistance(touches);
          if (lastDistance.current !== null) {
            const ratio = dist / lastDistance.current;
            const next = Math.min(Math.max(savedScale.current * ratio, 1), 5);
            savedScale.current = next;
            scale.setValue(next);
          }
          lastDistance.current = dist;
        } else if (touches.length === 1 && savedScale.current > 1) {
          translateX.setValue(baseX.current + gs.dx);
          translateY.setValue(baseY.current + gs.dy);
        }
      },

      onPanResponderRelease: (_, gs) => {
        if (savedScale.current > 1) {
          savedX.current = baseX.current + gs.dx;
          savedY.current = baseY.current + gs.dy;
        }
        lastDistance.current = null;
        if (savedScale.current < 1.08) resetZoom();
      },

      onPanResponderTerminate: (_, gs) => {
        if (savedScale.current > 1) {
          savedX.current = baseX.current + gs.dx;
          savedY.current = baseY.current + gs.dy;
        }
        lastDistance.current = null;
      },
    })
  ).current;

  // ── Web: wheel + double-click + mobile-browser touch pinch ──────────────────
  if (Platform.OS === 'web') {
    const getWebTouchDist = (touches: any) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const webHandlers: any = {
      // Desktop: mouse wheel zoom
      onWheel: (e: any) => {
        e.preventDefault?.();
        setWebScale((s) => Math.min(Math.max(s + (e.deltaY < 0 ? 0.2 : -0.2), 1), 5));
      },
      // Desktop: double-click toggle
      onDoubleClick: () => setWebScale((s) => (s > 1 ? 1 : 2.5)),
      // Mobile browser: touch pinch zoom
      onTouchStart: (e: any) => {
        if (e.touches.length === 2) {
          webPinchRef.current = {
            initialDist: getWebTouchDist(e.touches),
            initialScale: webScaleRef.current,
          };
        }
      },
      onTouchMove: (e: any) => {
        if (e.touches.length === 2 && webPinchRef.current) {
          e.preventDefault?.();
          const ratio = getWebTouchDist(e.touches) / webPinchRef.current.initialDist;
          setWebScale(Math.min(Math.max(webPinchRef.current.initialScale * ratio, 1), 5));
        }
      },
      onTouchEnd: () => { webPinchRef.current = null; },
      style: { cursor: webScale > 1 ? 'zoom-out' : 'zoom-in', touchAction: 'none' },
    };

    return (
      <View style={styles.container} {...webHandlers}>
        <View style={[styles.inner, { transform: [{ scale: webScale }] }]}>
          <Image source={{ uri }} style={styles.image} contentFit="contain" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.inner,
          { transform: [{ scale }, { translateX }, { translateY }] },
        ]}>
        <Image source={{ uri }} style={styles.image} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
