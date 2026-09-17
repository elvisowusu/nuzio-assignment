import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glow } from '../components/Glow';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { useAuth } from '../lib/auth';
import { colors, fonts, radius } from '../lib/theme';

/**
 * Screen 02 - LOGIN
 * "Good morning. News on go." + Continue with Google.
 */
export default function Login() {
  const { user, loading, error, googleReady, signInWithGoogle, signInAsDemo } = useAuth();

  if (user) return <Redirect href="/brief" />;

  return (
    <Screen>
      <View style={styles.glowLayer} pointerEvents="none">
        <Glow size={520} color={colors.violet} intensity={0.34} style={styles.glowTop} />
        <Glow size={360} color={colors.cyan} intensity={0.1} style={styles.glowBottom} />
      </View>

      <View style={styles.body}>
        <View style={styles.brandBlock}>
          <Glow size={190} color={colors.violet} intensity={0.4} style={styles.brandGlow} />
          <Logo size={54} showWordmark={false} />
        </View>

        <View style={styles.copy}>
          <Text style={styles.heading}>Good morning.</Text>
          <Text style={[styles.heading, styles.headingItalic]}>News on go.</Text>
          <Text style={styles.sub}>
            Personalised audio news for Indian professionals — curated every morning.
          </Text>
        </View>

        <View style={styles.actions}>
          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={googleReady ? signInWithGoogle : signInAsDemo}
            style={({ pressed }) => [styles.googleBtn, pressed && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator color="#1a1a1a" />
            ) : (
              <>
                <GoogleMark />
                <Text style={styles.googleLabel}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {!googleReady && (
            <Pressable
              onPress={signInAsDemo}
              disabled={loading}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            >
              <Ionicons name="play-circle-outline" size={16} color={colors.textDim} />
              <Text style={styles.ghostLabel}>Continue as guest</Text>
            </Pressable>
          )}

          <Text style={styles.legal}>
            By continuing you agree to our <Text style={styles.legalLink}>Terms</Text> &{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

/** Google's four-colour G, drawn with plain views to avoid an asset dependency. */
function GoogleMark() {
  return (
    <View style={styles.gMark}>
      <Text style={styles.gText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glowLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center' },
  glowTop: { position: 'absolute', top: -230 },
  glowBottom: { position: 'absolute', bottom: -160, left: -80 },

  body: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingBottom: 28 },

  brandBlock: { marginTop: 72, alignItems: 'flex-start', justifyContent: 'center', height: 90 },
  brandGlow: { position: 'absolute', left: -68, top: -50 },

  copy: { flex: 1, justifyContent: 'center', marginTop: -40 },
  heading: { fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: colors.text },
  headingItalic: { fontFamily: fonts.displayItalic, color: colors.violetLight },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    marginTop: 18,
    maxWidth: 300,
  },

  actions: { gap: 14 },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: '#FF9B9B',
    textAlign: 'center',
    lineHeight: 19,
  },

  googleBtn: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleLabel: { fontFamily: fonts.sansMedium, fontSize: 16, color: '#1A1A1A' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },

  gMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gText: { color: '#fff', fontFamily: fonts.sansBold, fontSize: 13, lineHeight: 16 },

  ghostBtn: {
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textDim },

  legal: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 4,
  },
  legalLink: { color: colors.textMuted },
});
