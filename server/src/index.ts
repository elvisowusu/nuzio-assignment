import cors from 'cors';
import express from 'express';
import { capabilities, config } from './config';
import { prisma } from './db';
import { authRouter } from './routes/auth';
import { briefRouter } from './routes/brief';
import { meRouter } from './routes/me';
import { storiesRouter } from './routes/stories';
import { ttsRouter } from './routes/tts';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const [users, stories] = await Promise.all([prisma.user.count(), prisma.story.count()]);
  res.json({ ok: true, capabilities, counts: { users, stories } });
});

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/brief', briefRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/tts', ttsRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(config.port, () => {
  console.log(`\n  Nuzio API  ->  http://localhost:${config.port}`);
  console.log(`  google auth : ${capabilities.googleAuth ? 'live' : 'demo sign-in only'}`);
  console.log(`  live news   : ${capabilities.liveNews ? 'GNews' : 'seeded stories'}`);
  console.log(`  narration   : ${capabilities.neuralTts ? 'ElevenLabs' : 'on-device speech'}\n`);
});
