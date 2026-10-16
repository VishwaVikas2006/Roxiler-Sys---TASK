import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { pingDatabase } from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { AUTH_TOKEN_HEADER } from './middleware/authenticate.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { storesRouter } from './modules/stores/stores.routes.js';
import { ownerRouter } from './modules/owner/owner.routes.js';

export function createApp() {
  const app = express();

  // Behind the Vite dev proxy / a reverse proxy, trust the first hop for client IPs (rate limiting).
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', AUTH_TOKEN_HEADER],
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.get('/api/health', async (_req, res) => {
    try {
      await pingDatabase();
      res.json({
        status: 'ok',
        db: 'up',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down', timestamp: new Date().toISOString() });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/stores', storesRouter);
  app.use('/api/owner', ownerRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
