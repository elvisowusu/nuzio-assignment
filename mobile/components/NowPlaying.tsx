import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BriefStory } from '../lib/api';
import { colors, fonts, formatClock, label, radius } from '../lib/theme';

interface Props {
  story: BriefStory;
  index: number;
  total: number;
  position: number;
  duration: number;
  progress: number;
  isPlaying: boolean;
  loading: boolean;
  speed: number;
  saved: boolean;
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onCycleSpeed: () => void;
  onSave: () => void;
  onSeek: (fraction: number) => void;
}

/** Screen 09 - the NOW PLAYING card, transport controls and scrubber. */
export function NowPlaying(p: Props) {
  const remaining = Math.max(0, p.duration - p.position);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={label}>Now playing · {p.story.category.replace('-', ' ')}</Text>
        <Text style={styles.counter}>
          {String(p.index + 1).padStart(2, '0')} / {String(p.total).padStart(2, '0')}
        </Text>
      </View>

      <Text style={styles.title}>{p.story.title}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaSource}>{p.story.source}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.meta}>{p.story.readMinutes} MIN</Text>
        <Text style={styles.metaDot}>·</Text>
        <Pressable onPress={p.onSave} hitSlop={8}>
          <Text style={[styles.meta, p.saved && styles.metaOn]}>
            {p.saved ? 'SAVED' : 'SAVE'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.summary} numberOfLines={3}>
        {p.story.summary}
      </Text>

      {/* scrubber */}
      <Pressable
        style={styles.trackHit}
        onPress={(e) => {
          const { locationX } = e.nativeEvent;
          const width = (e.currentTarget as unknown as { offsetWidth?: number }).offsetWidth ?? 300;
          p.onSeek(Math.max(0, Math.min(1, locationX / width)));
        }}
      >
        <View style={styles.track}>
          <LinearGradient
            colors={[colors.violet, colors.violetLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${p.progress * 100}%` }]}
          />
          <View style={[styles.knob, { left: `${p.progress * 100}%` }]} />
        </View>
      </Pressable>

      <View style={styles.times}>
        <Text style={styles.time}>{formatClock(p.position)}</Text>
        <Text style={styles.time}>-{formatClock(remaining)}</Text>
      </View>

      {/* transport */}
      <View style={styles.controls}>
        <Pressable onPress={p.onPrevious} style={styles.ctrl} accessibilityLabel="Previous story">
          <Ionicons name="play-skip-back" size={18} color={colors.textDim} />
        </Pressable>

        <Pressable onPress={p.onToggle} accessibilityLabel={p.isPlaying ? 'Pause' : 'Play'}>
          <LinearGradient
            colors={[colors.violetLight, colors.violet]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.playBtn}
          >
            {p.loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons
                name={p.isPlaying ? 'pause' : 'play'}
                size={24}
                color="#fff"
                style={{ marginLeft: p.isPlaying ? 0 : 3 }}
              />
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={p.onNext} style={styles.ctrl} accessibilityLabel="Next story">
          <Ionicons name="play-skip-forward" size={18} color={colors.textDim} />
        </Pressable>

        <Pressable onPress={p.onCycleSpeed} style={styles.speedBtn} accessibilityLabel="Playback speed">
          <Text style={styles.speedLabel}>{p.speed}×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontFamily: fonts.mono, fontSize: 10, color: colors.textFaint, letterSpacing: 1 },

  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 31,
    color: colors.text,
    marginTop: 12,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  metaSource: { fontFamily: fonts.mono, fontSize: 10, color: colors.violetLight, letterSpacing: 1 },
  meta: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, letterSpacing: 1 },
  metaOn: { color: colors.green },
  metaDot: { color: colors.textFaint, fontSize: 10 },

  summary: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 12,
  },

  trackHit: { paddingVertical: 12, marginTop: 6 },
  track: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.10)' },
  fill: { height: 3, borderRadius: 2 },
  knob: {
    position: 'absolute',
    top: -3.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    marginLeft: -5,
  },

  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  time: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.textMuted },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 16 },
  ctrl: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  speedBtn: {
    position: 'absolute',
    right: 0,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  speedLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.textDim },
});
