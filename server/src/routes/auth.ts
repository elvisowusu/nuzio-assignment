import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { config, capabilities } from '../config';
import { prisma } from '../db';
import { PROFESSIONS } from '../domain';
import { signToken } from '../middleware/auth';

export const authRouter = Router();
const googleClient = new OAuth2Client(config.googleClientId);

const googleBody = z.object({ idToken: z.string().min(10) });

/**
 * Screen 02 - "Continue with Google".
 * The app performs the OAuth dance and posts the resulting Google ID token here;
 * we verify it server-side and mint our own session JWT.
 */
authRouter.post('/google', async (req, res) => {
  const parsed = googleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'idToken is required' });

  if (!capabilities.googleAuth) {
    return res.status(503).json({
      error: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID, or use POST /api/auth/demo.',
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(401).json({ error: 'Google token carried no email' });

    const user = await upsertUser({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
      avatarUrl: payload.picture,
    });

    return res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch (err) {
    console.warn('[auth] Google verification failed:', (err as Error).message);
    return res.status(401).json({ error: 'Could not verify Google token' });
  }
});

/**
 * Demo sign-in. Lets the app (and a reviewer) reach the brief screen without
 * Google credentials configured. Disabled once GOOGLE_CLIENT_ID is set in production.
 */
authRouter.post('/demo', async (_req, res) => {
  const user = await upsertUser({
    email: 'aarav@nuzio.app',
    name: 'Aarav Sharma',
    avatarUrl: null,
  });
  return res.json({ token: signToken(user.id), user: publicUser(user), demo: true });
});

async function upsertUser(input: {
  googleId?: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { name: input.name, avatarUrl: input.avatarUrl ?? existing.avatarUrl, googleId: input.googleId ?? existing.googleId },
    });
  }

  const defaults = PROFESSIONS.find((p) => p.id === 'technology')!;
  return prisma.user.create({
    data: {
      ...input,
      avatarUrl: input.avatarUrl ?? undefined,
      preference: { create: { niches: defaults.niches.join(','), profession: defaults.id } },
    },
  });
}

const publicUser = (u: { id: string; email: string; name: string; avatarUrl: string | null }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  avatarUrl: u.avatarUrl,
});
