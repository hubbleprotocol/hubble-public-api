import logger from '../logger';
import { getRedisEnvironmentVariables } from '../environmentService';
import Redis from 'ioredis';
import AsyncLock from "async-lock";
import Redlock from "redlock";

export type CacheFetchOptions = {
  outerLockTimeoutMillis?: number,
  innerLockTimeoutMillis?: number,
  cacheExpirySeconds: number,
}

class RedisProvider {
  private readonly _client: Redis;
  private readonly _localMutex: AsyncLock;
  private readonly _redlock: Redlock;

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
      logger.warn({ message: 'redis client error', error: err, REDIS_HOST, REDIS_PORT })
    );
    this._localMutex = new AsyncLock();
    this._redlock = new Redlock([this._client], { retryCount: -1 });
  }

  get client(): Redis {
    return this._client;
  }

  async ping(): Promise<string> {
    try {
      return await this._client.ping();
    } catch (err) {
      logger.warn(`could not ping redis at http://${this._client.options.host}:${this._client.options.port}`, err);
      throw err;
    }
  }

  async getAndParseKey<T>(key: string): Promise<T | undefined> {
    const value = await this._client.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return undefined;
  }

  async getKey<T>(key: string): Promise<string | null> {
    return this._client.get(key);
  }

  saveAsJsonWithExpiry<T>(key: string, value: T, expireInSeconds: number) {
    logger.info({ message: 'saving key to redis', key, expireInSeconds });
    return this._client.multi().setnx(key, JSON.stringify(value)).expire(key, expireInSeconds).exec();
  }

  saveWithExpiry(key: string, value: string, expireInSeconds: number) {
    logger.info({ message: 'saving key to redis', key, expireInSeconds });
    return this._client.multi().setnx(key, value).expire(key, expireInSeconds).exec();
  }

  saveAsJsonWithExpiryAt<T>(key: string, value: T, expireAt: number) {
    logger.info({ message: 'saving key to redis', key, expireAt });
    return this._client.multi().setnx(key, JSON.stringify(value)).expireat(key, expireAt).exec();
  }

  saveWithExpireAt(key: string, value: string, expireAt: number) {
    logger.info({ message: 'saving key to redis', key, expireAt });
    return this._client.multi().setnx(key, value).expire(key, expireAt).exec();
  }

  async cacheFetch<T>(key: string, fetch: () => T | PromiseLike<T>, options: CacheFetchOptions): Promise<T> {
    let value = await this.getAndParseKey<T>(key);
    if (!value) {
      const distributedLockKey = `lock-${key}`;
      await this._localMutex.acquire(distributedLockKey, async () => {
        value = await this.getAndParseKey<T>(key);
        if (!value) {
          await this._redlock.using([distributedLockKey], options.outerLockTimeoutMillis || 10_000, async () => {
            value = await this.getAndParseKey<T>(key);
            if (!value) {
              value = await fetch();
              await this.saveAsJsonWithExpiry(key, value, options.cacheExpirySeconds);
            }
          });
        }
      }, { timeout: options.innerLockTimeoutMillis || 15_000 })
    }
    return value!
  }
}

const redis = new RedisProvider();
export default redis;
