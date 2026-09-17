import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

/** The Nuzio mark: a gradient rounded square with the wordmark beside it. */
export function Logo({ size = 40, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }}>
      <LinearGradient
        colors={[colors.violetLight, colors.violet]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.58, color: '#fff', marginTop: -size * 0.04 }}>
          N
        </Text>
      </LinearGradient>
      {showWordmark && (
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.62, color: colors.text, letterSpacing: 0.2 }}>
          Nuzio
        </Text>
      )}
    </View>
  );
}
