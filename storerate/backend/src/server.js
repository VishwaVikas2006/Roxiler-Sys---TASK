import { env } from './config/env.js';
import { db, pingDatabase } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  try {
    await pingDatabase();
  } catch (err) {
    console.error('[server] Could not connect to PostgreSQL. Check DATABASE_URL.', err.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[server] StoreRate API listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await db.destroy();
      process.exit(0);
    });
    // Force exit if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
