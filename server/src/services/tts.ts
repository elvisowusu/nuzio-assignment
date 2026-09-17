import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { voiceById } from '../domain';

const CACHE_DIR = path.join(process.cwd(), 'audio-cache');

const cacheKey = (text: string, voiceId: string) =>
  createHash('sha1').update(`${voiceId}:${text}`).digest('hex');

/**
 * Render narration to MP3 via ElevenLabs, cached on disk so repeat plays
 * (and re-reviews) never burn quota.
 *
 * Returns null when no API key is set - the client then narrates with
 * on-device speech synthesis instead, so playback always works.
 */
export async function synthesise(text: string, voiceId: string): Promise<Buffer | null> {
  if (!config.elevenLabsApiKey) return null;

  const voice = voiceById(voiceId);
  const key = cacheKey(text, voice.id);
  const file = path.join(CACHE_DIR, `${key}.mp3`);

  if (existsSync(file)) return readFile(file);

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.elevenLabsId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': config.elevenLabsApiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!res.ok) {
      console.warn(`[tts] ElevenLabs ${res.status}: ${await res.text().catch(() => '')}`);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(file, buf);
    return buf;
  } catch (err) {
    console.warn('[tts] synthesis failed:', (err as Error).message);
    return null;
  }
}

/** The script the narrator reads for one story. */
export function narrationScript(index: number, total: number, title: string, summary: string) {
  const trim = (s: string) => s.trim().replace(/[.\s]+$/, '');
  const headline = trim(title);
  const detail = trim(summary);

  // Headlines from RSS often carry no abstract; narrate the headline alone
  // rather than reading it back twice.
  return detail
    ? `Story ${index + 1} of ${total}. ${headline}. ${detail}.`
    : `Story ${index + 1} of ${total}. ${headline}.`;
}
