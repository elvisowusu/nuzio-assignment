import { Router } from 'express';
import { prisma } from '../db';
import { voiceById } from '../domain';
import { capabilities } from '../config';
import { requireAuthAllowingQueryToken, type AuthedRequest } from '../middleware/auth';
import { narrationScript, synthesise } from '../services/tts';

export const ttsRouter = Router();
// Audio URLs are loaded by the platform player, so this route also accepts
// the session token as a query parameter.
ttsRouter.use(requireAuthAllowingQueryToken);

/**
 * Narration audio for one story in a brief.
 *
 * 200 + audio/mpeg  -> neural voice from ElevenLabs (cached on disk)
 * 409 + JSON script -> no TTS key configured; the client narrates the returned
 *                      script with on-device speech using the voice hints.
 */
ttsRouter.get('/story/:storyId', async (req: AuthedRequest, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.storyId } });
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const pref = await prisma.preference.findUnique({ where: { userId: req.userId! } });
  const voice = voiceById(
    (typeof req.query.voice === 'string' ? req.query.voice : pref?.voiceId) ?? 'aria',
  );

  const index = Number(req.query.index ?? 0);
  const total = Number(req.query.total ?? 1);
  const script = narrationScript(index, total, story.title, story.summary);

  const audio = await synthesise(script, voice.id);

  if (!audio) {
    return res.status(409).json({
      mode: 'device-speech',
      reason: capabilities.neuralTts ? 'synthesis-failed' : 'no-tts-key',
      script,
      voice: { id: voice.id, locale: voice.speechLocale, pitch: voice.pitch, rate: voice.rate },
    });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Length', audio.length);
  return res.send(audio);
});
