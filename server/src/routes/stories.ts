import { Router } from 'express';
import { prisma } from '../db';
import { NICHES } from '../domain';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

export const storiesRouter = Router();
storiesRouter.use(requireAuth);

/** Screen 10 - Discover feed, optionally filtered by niche. */
storiesRouter.get('/', async (req: AuthedRequest, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
  const take = Math.min(50, Number(req.query.limit ?? 20));

  const stories = await prisma.story.findMany({
    where: {
      ...(category && category !== 'all' ? { category } : {}),
      ...(search ? { OR: [{ title: { contains: search } }, { summary: { contains: search } }] } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take,
  });

  return res.json({
    categories: [{ id: 'all', label: 'All' }, ...NICHES.map(({ id, label }) => ({ id, label }))],
    stories,
  });
});

storiesRouter.post('/:id/save', async (req: AuthedRequest, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const existing = await prisma.savedStory.findUnique({
    where: { userId_storyId: { userId: req.userId!, storyId: story.id } },
  });

  if (existing) {
    await prisma.savedStory.delete({ where: { id: existing.id } });
    return res.json({ saved: false });
  }

  await prisma.savedStory.create({ data: { userId: req.userId!, storyId: story.id } });
  return res.json({ saved: true });
});

storiesRouter.get('/saved', async (req: AuthedRequest, res) => {
  const saved = await prisma.savedStory.findMany({
    where: { userId: req.userId! },
    include: { story: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ stories: saved.map((s) => s.story) });
});
