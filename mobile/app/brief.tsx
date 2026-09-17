import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BriefHeader, FilterChips } from '../components/BriefHeader';
import { Glow } from '../components/Glow';
import { NowPlaying } from '../components/NowPlaying';
import { PreferencesSheet } from '../components/PreferencesSheet';
import { Screen } from '../components/Screen';
import { api, type Brief } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, fonts, formatClock, label, radius } from '../lib/theme';
import { usePlayer } from '../lib/usePlayer';

const DATE_FMT: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };

const prettyCategory = (id: string) =>
  id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/**
 * Screen 09 - MORNING BRIEF
 * The personalised audio brief: greeting, niche filters, now-playing card
 * with transport controls, and the rest of today's queue.
 */
export default function BriefScreen() {
  const { user, loading: authLoading, signOut, refresh: refreshUser } = useAuth();

  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [tuning, setTuning] = useState(false);

  const player = usePlayer(brief);

  const load = useCallback(async (refresh = false) => {
    try {
      setError(null);
      setBrief(await api.todaysBrief(refresh));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const categories = useMemo(() => {
    if (!brief) return [{ id: 'all', label: 'All' }];
    const ids = [...new Set(brief.stories.map((s) => s.category))];
    return [{ id: 'all', label: 'All' }, ...ids.map((id) => ({ id, label: prettyCategory(id) }))];
  }, [brief]);

  const queue = useMemo(() => {
    if (!brief) return [];
    return brief.stories.filter((s) => filter === 'all' || s.category === filter);
  }, [brief, filter]);

  const onSave = useCallback((storyId: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
    api.toggleSave(storyId).catch(() => {});
  }, []);

  if (authLoading) {
    return (
      <Centered>
        <ActivityIndicator color={colors.violetLight} />
      </Centered>
    );
  }
  if (!user) return <Redirect href="/login" />;

  return (
    <Screen>
      <Glow size={460} color={colors.violet} intensity={0.2} style={styles.glow} />

      <BriefHeader onSignOut={signOut} onTune={() => setTuning(true)} />

      <PreferencesSheet
        visible={tuning}
        preference={user.preference}
        onClose={() => setTuning(false)}
        onSaved={async () => {
          setLoading(true);
          setFilter('all');
          await refreshUser();
          await load(true);
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.violetLight}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
          />
        }
      >
        {loading ? (
          <View style={styles.centerPad}>
            <ActivityIndicator color={colors.violetLight} />
            <Text style={styles.loadingText}>CURATING YOUR BRIEF…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerPad}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => load(true)} style={styles.retry}>
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : brief ? (
          <>
            <Text style={[label, styles.dateLine]}>
              {new Date(brief.date).toLocaleDateString('en-GB', DATE_FMT)} · Morning brief
            </Text>

            <View style={styles.greetBlock}>
              <Text style={styles.greet}>{brief.greeting} —</Text>
              <Text style={styles.greetItalic}>{brief.storyCount} things.</Text>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.liveDot} />
              <Text style={styles.status}>
                {player.isPlaying ? 'Audio live' : 'Ready'} · Voice: {brief.voice.name} ·{' '}
                {brief.storyCount} stories · {formatClock(brief.totalSeconds)}
              </Text>
            </View>

            {player.story ? (
              <NowPlaying
                story={player.story}
                index={player.index}
                total={brief.storyCount}
                position={player.position}
                duration={player.duration}
                progress={player.progress}
                isPlaying={player.isPlaying}
                loading={player.loadingTrack}
                speed={player.speed}
                saved={saved.has(player.story.id)}
                onToggle={player.toggle}
                onNext={player.next}
                onPrevious={player.previous}
                onCycleSpeed={player.cycleSpeed}
                onSave={() => onSave(player.story!.id)}
                onSeek={() => {}}
              />
            ) : null}

            <View style={styles.filterWrap}>
              <FilterChips categories={categories} active={filter} onChange={setFilter} />
            </View>

            <Text style={[label, styles.queueLabel]}>Up next</Text>

            {queue.map((story) => {
              const isCurrent = story.order === player.index;
              return (
                <Pressable
                  key={story.id}
                  onPress={() => player.jumpTo(story.order)}
                  style={[styles.queueItem, isCurrent && styles.queueItemOn]}
                >
                  <View style={styles.queueIndex}>
                    {isCurrent && player.isPlaying ? (
                      <Ionicons name="volume-high" size={13} color={colors.violetLight} />
                    ) : (
                      <Text style={styles.queueNum}>{String(story.order + 1).padStart(2, '0')}</Text>
                    )}
                  </View>

                  <View style={styles.queueBody}>
                    <Text style={styles.queueCat}>
                      {prettyCategory(story.category).toUpperCase()} · {story.source}
                    </Text>
                    <Text style={styles.queueTitle} numberOfLines={2}>
                      {story.title}
                    </Text>
                  </View>

                  <Text style={styles.queueTime}>{formatClock(story.durationSec)}</Text>
                </Pressable>
              );
            })}

            {player.story ? (
              <View style={styles.ticker}>
                <Ionicons name="mic-outline" size={13} color={colors.violetLight} />
                <Text style={styles.tickerText} numberOfLines={1}>
                  {player.isPlaying ? 'Now narrating' : 'Paused'} — {player.story.title}
                </Text>
              </View>
            ) : null}

            <Text style={styles.engineNote}>
              {player.mode === 'audio'
                ? 'NEURAL NARRATION · ELEVENLABS'
                : 'ON-DEVICE NARRATION · ADD AN ELEVENLABS KEY FOR STUDIO VOICES'}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const Centered = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.centered}>{children}</View>
);

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', top: -260, alignSelf: 'center' },
  scroll: { paddingBottom: 48 },

  centerPad: { paddingTop: 90, alignItems: 'center', gap: 14 },
  loadingText: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, letterSpacing: 1.4 },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#FF9B9B',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  retry: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.surface,
  },
  retryLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textDim },

  dateLine: { paddingHorizontal: 20, marginTop: 8 },

  greetBlock: { paddingHorizontal: 20, marginTop: 10 },
  greet: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.text },
  greetItalic: {
    fontFamily: fonts.displayItalic,
    fontSize: 34,
    lineHeight: 38,
    color: colors.violetLight,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 18,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  status: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },

  filterWrap: { marginTop: 22 },
  queueLabel: { paddingHorizontal: 20, marginTop: 22, marginBottom: 10 },

  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 13,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  queueItemOn: { borderColor: colors.violet, backgroundColor: 'rgba(106,76,247,0.10)' },
  queueIndex: { width: 22, alignItems: 'center' },
  queueNum: { fontFamily: fonts.mono, fontSize: 11, color: colors.textFaint },
  queueBody: { flex: 1 },
  queueCat: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 4,
  },
  queueTitle: { fontFamily: fonts.sansMedium, fontSize: 13.5, lineHeight: 18, color: colors.text },
  queueTime: { fontFamily: fonts.mono, fontSize: 10, color: colors.textFaint },

  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(106,76,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(106,76,247,0.30)',
  },
  tickerText: { flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.textDim },

  engineNote: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 30,
  },
});
