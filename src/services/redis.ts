import logger from './logger';
import { getRedisEnvironmentVariables } from './environmentService';
import Redis from 'ioredis';

export = class RedisProvider {
  private readonly _client: Redis.Redis;
  constructor() {
    const { REDIS_HOST, REDIS_PORT } = getRedisEnvironmentVariables();
    this._client = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      connectTimeout: 3000,
    });
    this._client.on('connect', () => logger.info({ message: 'redis connecting', REDIS_HOST, REDIS_PORT }));
    this._client.on('ready', () => logger.info({ message: 'redis connected successfully', REDIS_HOST, REDIS_PORT }));
    this._client.on('reconnecting', () => logger.info({ message: 'redis reconnecting', REDIS_HOST, REDIS_PORT }));
    this._client.on('close', () => logger.info({ message: 'redis connection closed', REDIS_HOST, REDIS_PORT }));
    this._client.on('error', (err) =>
      logger.error({ message: 'redis client error', error: err, REDIS_HOST, REDIS_PORT })
    );
  }
  get client(): Redis.Redis {
    return this._client;
  }
};
