import { createClient, RedisClientType, RedisDefaultModules, RedisModules, RedisScripts } from 'redis';
import { ENV } from './web3/client';
import { MetricsSnapshot } from '../models/api/MetricsSnapshot';
import logger from './logger';

export default class RedisService {
  private _client: RedisClientType<RedisDefaultModules & RedisModules, RedisScripts>;

  constructor(host: string, port: number) {
    this._client = createClient({ socket: { host: host, port: port } });
  }

  async connect() {
    for (let i = 0; i < 5; i++) {
      try {
        await this._client.connect();
        return;
      } catch (e) {
        if (i === 4) {
          logger.error('could not connect to Redis in 5 tries', e);
          throw e;
        }
        logger.error(`[#${i}] could not connect to redis... retrying after 5s`, e);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  disconnect() {
    return this._client.disconnect();
  }

  ping() {
    return this._client.ping();
  }

  async getMetrics(env: ENV) {
    const history = await this._client.get(`history-${env}`);
    if (history) {
      return JSON.parse(history) as MetricsSnapshot[];
    }
    return undefined;
  }

  async setMetrics(metrics: MetricsSnapshot[], env: ENV) {
    // expire the metrics cache on the first minute of the next hour, we only keep hourly snapshots of history in dynamodb and refresh once per hour
    // for example, we save to cache at 10:15, hourly snapshot is saved to dynamodb at 11:00, we need to refresh the cache at 11:01
    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 1);
    expireAt.setMinutes(1);
    expireAt.setSeconds(0);

    const key = `history-${env}`;

    logger.info('cache metrics in redis:', key, 'expire at:', expireAt);

    await this._client.set(key, JSON.stringify(metrics));
    await this._client.expireAt(key, expireAt);
  }
}
