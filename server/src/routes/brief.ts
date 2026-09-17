import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { getOrCreateTodaysBrief, serialiseBrief } from '../services/brief';

export const briefRouter = Router();
briefRouter.use(requireAuth);

/** Screen 09 - today's personalised brief. */
briefRouter.get('/today', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const refresh = req.query.refresh === 'true';
  const brief = await getOrCreateTodaysBrief(req.userId!, { refresh });
  if (!brief) return res.status(500).json({ error: 'Could not build a brief' });

  return res.json(serialiseBrief(brief, user.name));
});

const progressBody = z.object({
  currentIndex: z.number().int().min(0),
  positionSec: z.number().min(0),
  completed: z.boolean().optional(),
});

/** Persist playback position so the brief resumes where the listener left off. */
briefRouter.post('/:id/progress', async (req: AuthedRequest, res) => {
  const parsed = progressBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid progress payload' });

  const brief = await prisma.brief.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { items: { orderBy: { order: 'asc' } } },
  });
  if (!brief) return res.status(404).json({ error: 'Brief not found' });

  const { currentIndex, positionSec, completed } = parsed.data;

  // Everything before the current story counts as played.
  await Promise.all(
    brief.items
      .filter((item) => item.order < currentIndex && !item.played)
      .map((item) => prisma.briefItem.update({ where: { id: item.id }, data: { played: true } })),
  );

  const updated = await prisma.brief.update({
    where: { id: brief.id },
    data: {
      currentIndex: Math.min(currentIndex, Math.max(0, brief.items.length - 1)),
      positionSec: Math.round(positionSec),
      completed: completed ?? brief.completed,
    },
  });

  return res.json({
    currentIndex: updated.currentIndex,
    positionSec: updated.positionSec,
    completed: updated.completed,
  });
});
