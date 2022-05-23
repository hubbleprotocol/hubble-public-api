import logger from '../logger';
import { getRedisEnvironmentVariables } from '../environmentService';
import Redis from 'ioredis';

export default class RedisProvider {
  private static instance: RedisProvider;
  private readonly _client: Redis.Redis;

  constructor() {
    if (RedisProvider.instance) {
      throw new Error('Error - use Singleton.getInstance()');
    }
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
      logger.warn({ message: 'redis client error', error: err, REDIS_HOST, REDIS_PORT })
    );
  }

  static getInstance(): RedisProvider {
    RedisProvider.instance = RedisProvider.instance || new RedisProvider();
    return RedisProvider.instance;
  }

  get client(): Redis.Redis {
    return this._client;
  }

  async getAndParseKey<T>(key: string): Promise<T | undefined> {
    const value = await this._client.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return undefined;
  }

  saveWithExpiry<T>(key: string, value: T, expireInSeconds: number) {
    logger.info({ message: 'saving key to redis', key, expireInSeconds });
    return this._client.multi().setnx(key, JSON.stringify(value)).expire(key, expireInSeconds).exec();
  }

  saveWithExpireAt<T>(key: string, value: T, expireAt: number) {
    logger.info({ message: 'saving key to redis', key, expireAt });
    return this._client.multi().setnx(key, JSON.stringify(value)).expireat(key, expireAt).exec();
  }
}
