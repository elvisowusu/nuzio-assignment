import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '30d' });
}

function verify(token: string, req: AuthedRequest): boolean {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
    req.userId = payload.sub;
    return true;
  } catch {
    return false;
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  if (!verify(header.slice(7), req)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  next();
}

/**
 * Same check, but also accepts `?token=` from the query string.
 *
 * Media URLs are handed to the platform audio player, which fetches them
 * itself and cannot attach an Authorization header — impossible on web, where
 * playback goes through an <audio> element. Restricted to media routes.
 */
export function requireAuthAllowingQueryToken(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const fromQuery = typeof req.query.token === 'string' ? req.query.token : null;
  const token = fromHeader ?? fromQuery;

  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  if (!verify(token, req)) return res.status(401).json({ error: 'Invalid or expired token' });
  next();
}
