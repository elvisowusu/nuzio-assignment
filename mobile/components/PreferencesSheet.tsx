import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, type Preference } from '../lib/api';
import { colors, fonts, label, radius } from '../lib/theme';

const MAX_NICHES = 7;
const LENGTHS = [5, 10, 15] as const;

interface Option { id: string; label: string; emoji?: string }
interface VoiceOption {
  id: string;
  name: string;
  initial: string;
  descriptor: string;
  langLabel: string;
}

/**
 * Condensed version of onboarding screens 04 (niches) and 05 (voice + length),
 * surfaced from the brief so personalisation can be changed and the brief
 * rebuilt without leaving the player.
 */
export function PreferencesSheet({
  visible,
  preference,
  onClose,
  onSaved,
}: {
  visible: boolean;
  preference: Preference | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [niches, setNiches] = useState<Option[]>([]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [voiceId, setVoiceId] = useState('aria');
  const [minutes, setMinutes] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    api.options()
      .then((o) => {
        setNiches(o.niches);
        setVoices(o.voices);
      })
      .catch(() => setError('Could not load options'));
  }, [visible]);

  useEffect(() => {
    if (!preference) return;
    setSelected(preference.niches);
    setVoiceId(preference.voiceId);
    setMinutes(preference.briefMinutes);
  }, [preference, visible]);

  const toggleNiche = (id: string) => {
    setError(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((n) => n !== id);
      if (prev.length >= MAX_NICHES) {
        setError(`Pick up to ${MAX_NICHES} niches.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const save = async () => {
    if (selected.length === 0) {
      setError('Pick at least one niche.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updatePreferences({ niches: selected, voiceId, briefMinutes: minutes, onboarded: true });
      // Dismiss first: rebuilding the brief refetches live news and can take a
      // few seconds, which belongs behind the sheet, not inside it.
      onClose();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Tune your brief.</Text>
              <Text style={styles.subtitle}>Changes rebuild tomorrow's running order now.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={18} color={colors.textDim} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.sectionHead}>
              <Text style={label}>What moves your world?</Text>
              <Text style={styles.count}>
                {selected.length}/{MAX_NICHES}
              </Text>
            </View>

            <View style={styles.chipWrap}>
              {niches.map((n) => {
                const on = selected.includes(n.id);
                return (
                  <Pressable
                    key={n.id}
                    onPress={() => toggleNiche(n.id)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    {n.emoji ? <Text style={styles.chipEmoji}>{n.emoji}</Text> : null}
                    <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{n.label}</Text>
                    {on ? <Ionicons name="checkmark" size={12} color={colors.onViolet} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={[label, styles.sectionGap]}>Narrator voice</Text>
            <View style={styles.voiceList}>
              {voices.map((v) => {
                const on = v.id === voiceId;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => setVoiceId(v.id)}
                    style={[styles.voiceRow, on && styles.voiceRowOn]}
                  >
                    <LinearGradient
                      colors={on ? [colors.violetLight, colors.violet] : ['#2A2A2A', '#1E1E1E']}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>{v.initial}</Text>
                    </LinearGradient>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.voiceName}>{v.name}</Text>
                      <Text style={styles.voiceDesc}>{v.descriptor}</Text>
                    </View>

                    <Text style={styles.voiceLang}>{v.langLabel}</Text>
                    {on ? <Ionicons name="checkmark-circle" size={17} color={colors.violetLight} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={[label, styles.sectionGap]}>How long is your morning?</Text>
            <View style={styles.lengthRow}>
              {LENGTHS.map((m) => {
                const on = m === minutes;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMinutes(m)}
                    style={[styles.lengthBtn, on && styles.lengthBtnOn]}
                  >
                    <Text style={[styles.lengthLabel, on && styles.lengthLabelOn]}>{m} min</Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <Pressable onPress={save} disabled={saving} style={styles.saveWrap}>
            <LinearGradient
              colors={[colors.violetLight, colors.violet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.save}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveLabel}>Rebuild my brief →</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    maxHeight: '88%',
    backgroundColor: '#131313',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  grabber: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center', marginTop: 10, marginBottom: 16,
  },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  title: { fontFamily: fonts.display, fontSize: 27, color: colors.text },
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.textMuted, marginTop: 3 },
  close: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingBottom: 12 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontFamily: fonts.mono, fontSize: 10, color: colors.violetLight, letterSpacing: 1 },
  sectionGap: { marginTop: 24, marginBottom: 12 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline,
  },
  chipOn: { backgroundColor: colors.violet, borderColor: colors.violet },
  chipEmoji: { fontSize: 12 },
  chipLabel: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.textDim },
  chipLabelOn: { color: colors.onViolet },

  voiceList: { gap: 8 },
  voiceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline,
  },
  voiceRowOn: { borderColor: colors.violet, backgroundColor: 'rgba(106,76,247,0.10)' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 17, color: '#fff' },
  voiceName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  voiceDesc: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  voiceLang: { fontFamily: fonts.mono, fontSize: 9, color: colors.textFaint, letterSpacing: 1 },

  lengthRow: { flexDirection: 'row', gap: 8 },
  lengthBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center',
  },
  lengthBtnOn: { borderColor: colors.violet, backgroundColor: 'rgba(106,76,247,0.12)' },
  lengthLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textMuted },
  lengthLabelOn: { color: colors.text },

  error: {
    fontFamily: fonts.sans, fontSize: 12.5, color: '#FF9B9B',
    marginTop: 16, textAlign: 'center',
  },

  saveWrap: { marginTop: 16 },
  save: { height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  saveLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: '#fff' },
});
