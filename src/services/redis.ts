import { createClient, RedisClientType, RedisDefaultModules, RedisModules, RedisScripts } from 'redis';
import logger from './logger';

let redisClient: RedisClientType<RedisDefaultModules & RedisModules, RedisScripts> | undefined;

async function getClient(host: string, port: number) {
  const client = createClient({
    socket: {
      host: host,
      port: port,
      connectTimeout: 3000,
      reconnectStrategy(retries: number) {
        if (retries < 10) {
          return 2500;
        }
        const err = 'could not reconnect to redis after 10 tries';
        logger.error({ message: err, host, port });
        throw Error(err);
      },
    },
  });
  client.on('connect', () => logger.info({ message: 'redis connecting', host, port }));
  client.on('ready', () => logger.info({ message: 'redis connected successfully', host, port }));
  client.on('reconnecting', () => logger.info({ message: 'redis reconnecting', host, port }));
  client.on('error', (err) => logger.error({ message: 'redis client error', error: err }));
  await client.connect();
  return client;
}

export function getRedisClient(host: string, port: number) {
  if (redisClient) {
    return redisClient;
  }
  return getClient(host, port);
}

export default getRedisClient;
