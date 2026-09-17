import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

/**
 * Ink-black page shell. On web the app is constrained to a phone-width column
 * so the layout reads the way it was designed rather than stretching.
 */
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={styles.outer}>
      <SafeAreaView style={[styles.frame, style]} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#050505' : colors.ink,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
});
