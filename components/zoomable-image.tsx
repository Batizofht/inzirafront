import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

interface Props {
  uri: string;
}

export function ZoomableImage({ uri }: Props) {
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
      // Prevent parent Pressable/ScrollView from stealing touches
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        savedScale.current > 1 || Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2,

      onPanResponderGrant: () => {
        // Snapshot committed values as the base for this gesture's deltas
        baseScale.current = savedScale.current;
        baseX.current = savedX.current;
        baseY.current = savedY.current;
        lastDistance.current = null;

        // Double-tap detection
        const now = Date.now();
        if (now - lastTap.current < 280) {
          resetZoom();
        }
        lastTap.current = now;
      },

      onPanResponderMove: (e, gs) => {
        const touches = e.nativeEvent.touches;

        if (touches.length === 2) {
          // ── PINCH ──────────────────────────────────────────────────────────
          const dist = getDistance(touches);
          if (lastDistance.current !== null) {
            const ratio = dist / lastDistance.current;
            const next = Math.min(Math.max(savedScale.current * ratio, 1), 5);
            savedScale.current = next;
            scale.setValue(next);
          }
          lastDistance.current = dist;
        } else if (touches.length === 1 && savedScale.current > 1) {
          // ── PAN (only while zoomed in) ──────────────────────────────────
          // gs.dx / gs.dy are deltas from THIS gesture's start — add to base
          translateX.setValue(baseX.current + gs.dx);
          translateY.setValue(baseY.current + gs.dy);
        }
      },

      onPanResponderRelease: (_, gs) => {
        // Commit final position
        if (savedScale.current > 1) {
          savedX.current = baseX.current + gs.dx;
          savedY.current = baseY.current + gs.dy;
        }
        lastDistance.current = null;
        // Snap back if barely zoomed
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