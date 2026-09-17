import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { NICHES, PROFESSIONS, VOICES, csvToList } from '../domain';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get('/', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { preference: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    preference: user.preference
      ? { ...user.preference, niches: csvToList(user.preference.niches) }
      : null,
  });
});

const prefBody = z.object({
  language: z.enum(['en', 'hi']).optional(),
  city: z.string().max(80).nullable().optional(),
  profession: z.enum(PROFESSIONS.map((p) => p.id) as [string, ...string[]]).optional(),
  niches: z.array(z.enum(NICHES.map((n) => n.id) as [string, ...string[]])).min(1).max(7).optional(),
  voiceId: z.enum(VOICES.map((v) => v.id) as [string, ...string[]]).optional(),
  briefMinutes: z.number().int().min(3).max(30).optional(),
  deliveryTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  speed: z.number().min(0.5).max(2).optional(),
  autoAdvance: z.boolean().optional(),
  onboarded: z.boolean().optional(),
});

meRouter.put('/preferences', async (req: AuthedRequest, res) => {
  const parsed = prefBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid preferences', details: parsed.error.flatten() });
  }

  const { niches, ...rest } = parsed.data;
  const data = { ...rest, ...(niches ? { niches: niches.join(',') } : {}) };

  const pref = await prisma.preference.upsert({
    where: { userId: req.userId! },
    create: { userId: req.userId!, ...data },
    update: data,
  });

  return res.json({ ...pref, niches: csvToList(pref.niches) });
});

/** Option catalogues for the onboarding screens. */
meRouter.get('/options', (_req, res) =>
  res.json({
    niches: NICHES.map(({ id, label, emoji }) => ({ id, label, emoji })),
    professions: PROFESSIONS.map(({ id, label, emoji }) => ({ id, label, emoji })),
    voices: VOICES.map(({ id, name, initial, langLabel, descriptor, lang }) => ({
      id, name, initial, langLabel, descriptor, lang,
    })),
  }),
);
