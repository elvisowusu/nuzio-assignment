import { View, type ViewStyle } from 'react-native';

/**
 * React Native has no radial-gradient primitive, so the Figma's ambient glows
 * are approximated with concentric translucent circles.
 */
export function Glow({
  size,
  color = '#6A4CF7',
  intensity = 0.28,
  rings = 18,
  style,
}: {
  size: number;
  color?: string;
  intensity?: number;
  rings?: number;
  style?: ViewStyle;
}) {
  return (
    <View pointerEvents="none" style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {Array.from({ length: rings }).map((_, i) => {
        const t = (i + 1) / rings;                 // 0 -> centre, 1 -> outer
        const d = size * t;
        // Quadratic falloff over many thin rings reads as a smooth gradient
        // rather than the visible banding a handful of steps produces.
        const opacity = (intensity / rings) * 2 * (1 - t) ** 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: color,
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}
