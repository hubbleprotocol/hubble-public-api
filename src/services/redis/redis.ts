import logger from '../logger';
import { getRedisEnvironmentVariables } from '../environmentService';
import Redis from 'ioredis';
import AsyncLock from 'async-lock';
import Redlock from 'redlock';
import { dateToUnixSeconds } from '../../utils/calculations';

export enum CacheExpiryType {
  NoExpiration,
  ExpireInSeconds,
  ExpireAtDate,
}

export type CacheFetchOptions = {
  outerLockTimeoutMillis?: number;
  innerLockTimeoutMillis?: number;
  cacheExpiryType: CacheExpiryType;
  cacheExpirySeconds?: number;
  cacheExpireAt?: Date;
};

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

  async getAndParseKey<T>(key: string): Promise<T | null> {
    const value = await this._client.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  }

  getKey<T>(key: string): Promise<string | null> {
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

  cacheFetch(key: string, fetch: () => PromiseLike<string>, options: CacheFetchOptions): Promise<string> {
    return this.saveWithMutex(key, (s) => this.getKey(s), fetch, this.getCacheSaveMethod(options), options);
  }

  cacheFetchJson<T>(key: string, fetch: () => PromiseLike<T>, options: CacheFetchOptions): Promise<T> {
    return this.saveWithMutex(key, (s) => this.getAndParseKey(s), fetch, this.getCacheSaveJsonMethod(options), options);
  }

  private getCacheSaveJsonMethod<T>(
    options: CacheFetchOptions
  ): (key: string, value: T, expiry: number) => PromiseLike<any> {
    this.validateCacheOptions(options);
    switch (options.cacheExpiryType) {
      case CacheExpiryType.NoExpiration: {
        return () => Promise.resolve();
      }
      case CacheExpiryType.ExpireInSeconds: {
        return (key, val, exp) => this.saveAsJsonWithExpiry(key, val, exp);
      }
      case CacheExpiryType.ExpireAtDate: {
        return (key, val, exp) => this.saveAsJsonWithExpiryAt(key, val, exp);
      }
    }
  }

  private getCacheSaveMethod(
    options: CacheFetchOptions
  ): (key: string, value: string, expiry: number) => PromiseLike<any> {
    this.validateCacheOptions(options);
    switch (options.cacheExpiryType) {
      case CacheExpiryType.NoExpiration: {
        return () => Promise.resolve();
      }
      case CacheExpiryType.ExpireInSeconds: {
        return (key, val, exp) => this.saveWithExpiry(key, val, exp);
      }
      case CacheExpiryType.ExpireAtDate: {
        return (key, val, exp) => this.saveWithExpireAt(key, val, exp);
      }
    }
  }

  private getCacheExpiry(options: CacheFetchOptions) {
    switch (options.cacheExpiryType) {
      case CacheExpiryType.NoExpiration: {
        return 0;
      }
      case CacheExpiryType.ExpireInSeconds: {
        return options.cacheExpirySeconds!;
      }
      case CacheExpiryType.ExpireAtDate: {
        return dateToUnixSeconds(options.cacheExpireAt!);
      }
    }
  }

  private validateCacheOptions(options: CacheFetchOptions) {
    if (options.cacheExpiryType === CacheExpiryType.ExpireInSeconds && options.cacheExpirySeconds === undefined) {
      throw Error('Invalid usage: Cache expiry in seconds argument missing');
    } else if (options.cacheExpiryType === CacheExpiryType.ExpireAtDate && options.cacheExpireAt === undefined) {
      throw Error('Invalid usage: Cache expiry date argument missing');
    }
  }

  private async saveWithMutex<T>(
    key: string,
    get: (key: string) => PromiseLike<T | null>,
    fetch: () => PromiseLike<T>,
    save: (key: string, value: T, expiry: number) => PromiseLike<any>,
    options: CacheFetchOptions
  ): Promise<T> {
    let value = await get(key);
    if (value === undefined || value === null) {
      const distributedLockKey = `mutex-${key}`;
      await this._localMutex.acquire(
        distributedLockKey,
        async () => {
          value = await get(key);
          if (value === undefined || value === null) {
            await this._redlock.using([distributedLockKey], options.outerLockTimeoutMillis || 25_000, async () => {
              value = await get(key);
              if (value === undefined || value === null) {
                value = await fetch();
                if (value !== undefined && value !== null) {
                  await save(key, value, this.getCacheExpiry(options));
                }
              }
            });
          }
        },
        { timeout: options.innerLockTimeoutMillis || 30_000 }
      );
    }
    return value!;
  }
}

const redis = new RedisProvider();
export default redis;
