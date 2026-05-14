import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { redisClient } from './redis-client.js';

export async function checkSystemHealth(): Promise<{
  api: boolean;
  database: boolean;
  redis: boolean;
  whatsapp: boolean;
}> {
  const [database, redis] = await Promise.all([
    db.execute(sql`SELECT 1`).then(() => true).catch(() => false),
    redisClient.ping().then((r) => r === 'PONG').catch(() => false),
  ]);

  return {
    api: true,
    database,
    redis,
    whatsapp: Boolean(process.env['WHATSAPP_ACCESS_TOKEN']),
  };
}
