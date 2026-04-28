import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

type RangeSliderProps = {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
};

const THUMB_SIZE = 16;

export function RangeSlider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
}: RangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const min = minimumValue;
  const max = Math.max(minimumValue, maximumValue);
  const clampedValue = Math.min(Math.max(value, min), max);
  const ratio = max === min ? 0 : (clampedValue - min) / (max - min);

  const updateFromX = (x: number) => {
    if (trackWidth <= 0) return;

    const boundedX = Math.max(0, Math.min(trackWidth, x));
    const raw = min + (boundedX / trackWidth) * (max - min);
    const snapped = Math.round(raw / step) * step;
    const boundedValue = Math.max(min, Math.min(max, snapped));
    onValueChange(boundedValue);
  };

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const thumbLeft = Math.max(0, trackWidth * ratio - THUMB_SIZE / 2);

  return (
    <View
      style={styles.touchArea}
      onLayout={onTrackLayout}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => updateFromX(e.nativeEvent.locationX)}
      onResponderMove={(e) => updateFromX(e.nativeEvent.locationX)}>
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]} />
      <View style={[styles.activeTrack, { width: `${ratio * 100}%`, backgroundColor: minimumTrackTintColor }]} />
      <View style={[styles.thumb, { left: thumbLeft, backgroundColor: minimumTrackTintColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 999,
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 999,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: 6,
  },
});
