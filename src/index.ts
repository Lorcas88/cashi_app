import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import categoriesRouter from './routes/categories.routes.js';
import transactionRouter from './routes/transactions.routes.js';
import authRouter from './routes/auth.routes.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';

const app = new Hono();

app.use(
  cors({
    origin: (origin) => {
      console.log('Origin recibido:', origin);
      const allowed = [
        'http://localhost:8081',
        'https://cashi-app.onrender.com',
      ];
      const tunnelPatterns = [
        /https:\/\/.*\.ngrok-free\.app$/,
        /https:\/\/.*\.ngrok\.io$/,
        /https?:\/\/.*\.exp\.direct$/,
      ];

      if (allowed.includes(origin)) return origin;
      if (tunnelPatterns.some((pattern) => pattern.test(origin))) return origin;
      return '';
    },
  }),
);

// Health check (no auth required)
app.get('/', (c) =>
  c.json({ status: 'ok', message: 'API de Finanzas — Cashi' }),
);

// Auth routes (no auth required)
app.route('/auth', authRouter);

// Apply auth middleware to all routes below
app.use('*', authMiddleware);

// Protected paths
app.route('/categories', categoriesRouter);
app.route('/transactions', transactionRouter);

// Protected paths to upload receipts
app.use('/uploads/*', serveStatic({ root: './' }));

const PORT = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
