import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Brief } from './api';

type Mode = 'idle' | 'audio' | 'speech';

/**
 * Drives narration for the morning brief.
 *
 * Two engines behind one interface:
 *   audio  - MP3 streamed from the backend (ElevenLabs, when a key is set)
 *   speech - on-device speech synthesis, using the script the backend returns
 *
 * The speech engine reports no playback position, so progress there is driven
 * by a synthetic ticker against the story's estimated duration.
 */
export function usePlayer(brief: Brief | null) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<Mode>('idle');
  const [loadingTrack, setLoadingTrack] = useState(false);

  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestRef = useRef(0);
  const savedRef = useRef(0);

  const story = brief?.stories[index] ?? null;
  const duration = mode === 'audio' && status?.duration ? status.duration : story?.durationSec ?? 0;

  const clearTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  const stopAll = useCallback(() => {
    clearTick();
    Speech.stop();
    try { player.pause(); } catch { /* player not loaded yet */ }
  }, [clearTick, player]);

  // Resume where the listener left off.
  useEffect(() => {
    if (!brief) return;
    setIndex(brief.playback.currentIndex);
    setPosition(brief.playback.positionSec);
  }, [brief?.id]);

  // Follow the audio engine's clock.
  useEffect(() => {
    if (mode !== 'audio' || !status) return;
    setPosition(status.currentTime ?? 0);
    if (status.didJustFinish) advance();
  }, [status?.currentTime, status?.didJustFinish, mode]);

  /** Load and start narration for `target`. */
  const playStory = useCallback(
    async (target: number, startAt = 0) => {
      if (!brief) return;
      const item = brief.stories[target];
      if (!item) return;

      const token = ++requestRef.current;
      stopAll();
      setLoadingTrack(true);
      setIndex(target);
      setPosition(startAt);

      try {
        const narration = await api.narration(item.id, target, brief.storyCount, brief.voice.id);
        if (token !== requestRef.current) return; // a newer request superseded this one

        if (narration.kind === 'audio') {
          setMode('audio');
          player.replace({ uri: narration.url });
          player.setPlaybackRate(speed);
          if (startAt > 0) player.seekTo(startAt);
          player.play();
        } else {
          setMode('speech');
          const { script, voice } = narration.plan;
          Speech.speak(script, {
            language: voice.locale,
            pitch: voice.pitch,
            rate: voice.rate * speed,
            onDone: () => {
              if (token === requestRef.current) advance();
            },
          });

          // Synthetic progress: speech synthesis exposes no position.
          clearTick();
          let elapsed = startAt;
          tickRef.current = setInterval(() => {
            elapsed += 0.5 * speed;
            setPosition(Math.min(elapsed, item.durationSec));
          }, 500);
        }
        setIsPlaying(true);
      } catch {
        setMode('idle');
        setIsPlaying(false);
      } finally {
        if (token === requestRef.current) setLoadingTrack(false);
      }
    },
    [brief, player, speed, stopAll, clearTick],
  );

  const advance = useCallback(() => {
    if (!brief) return;
    const next = index + 1;
    if (next < brief.stories.length) {
      playStory(next);
    } else {
      stopAll();
      setIsPlaying(false);
      setPosition(0);
      api.saveProgress(brief.id, index, 0, true).catch(() => {});
    }
  }, [brief, index, playStory, stopAll]);

  const toggle = useCallback(() => {
    if (!brief) return;

    if (isPlaying) {
      stopAll();
      setIsPlaying(false);
      return;
    }

    // Speech synthesis cannot resume mid-utterance, so it restarts the story.
    if (mode === 'audio') {
      player.play();
      setIsPlaying(true);
    } else {
      playStory(index, 0);
    }
  }, [brief, isPlaying, mode, player, index, playStory, stopAll]);

  const next = useCallback(() => {
    if (brief && index < brief.stories.length - 1) playStory(index + 1);
  }, [brief, index, playStory]);

  const previous = useCallback(() => {
    if (position > 4) return playStory(index, 0);   // restart current, like a music player
    if (index > 0) playStory(index - 1);
  }, [index, position, playStory]);

  const jumpTo = useCallback((target: number) => playStory(target, 0), [playStory]);

  const cycleSpeed = useCallback(() => {
    const order = [1, 1.25, 1.5, 2, 0.75];
    const nextSpeed = order[(order.indexOf(speed) + 1) % order.length];
    setSpeed(nextSpeed);
    if (mode === 'audio') player.setPlaybackRate(nextSpeed);
  }, [speed, mode, player]);

  // Persist progress at most once every 5 seconds of playback.
  useEffect(() => {
    if (!brief || !isPlaying) return;
    const now = Date.now();
    if (now - savedRef.current < 5000) return;
    savedRef.current = now;
    api.saveProgress(brief.id, index, position).catch(() => {});
  }, [brief, isPlaying, index, position]);

  useEffect(() => stopAll, [stopAll]);

  return {
    index, story, isPlaying, position, duration, speed, mode, loadingTrack,
    toggle, next, previous, jumpTo, cycleSpeed,
    progress: duration > 0 ? Math.min(1, position / duration) : 0,
  };
}
