import { createApp } from './app';
import { env } from './config/env';
import { disconnectDb, prisma } from './config/db';

async function bootstrap(): Promise<void> {
  // Fail fast if the database is unreachable / not migrated.
  await prisma.$connect();
  console.log('[db] database connection established');

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[api] University Portal API listening on http://localhost:${env.port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[api] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
