import { badRequest, sendWithCacheControl } from '../utils/apiUtils';
import { ENV } from '../services/web3/client';
import { MetricsSnapshot } from '../models/api/MetricsSnapshot';
import { HistoryResponse } from '../models/api/HistoryResponse';
import Router from 'express-promise-router';
import { Request } from 'express';
import Decimal from 'decimal.js';
import redis, { CacheExpiryType } from '../services/redis/redis';
import { getNextSnapshotDate } from '../utils/calculations';
import { getHistoryRedisKey } from '../services/redis/keyProvider';
import { getMetricsHistory } from '../services/database';
import { middleware } from './middleware/middleware';

/**
 * Get Hubble on-chain historical metrics
 */
const historyRoute = Router();
type HistoryQueryParams = {
  env: ENV | undefined;
  year: string | undefined;
};
historyRoute.get(
  '/',
  middleware.validateSolanaCluster,
  async (request: Request<never, string | HistoryResponse, never, HistoryQueryParams>, response) => {
    let env: ENV = request.query.env ?? 'mainnet-beta';
    let year = request.query.year ? +request.query.year : new Date().getFullYear();
    if (year < 2022) {
      response.status(badRequest).send('Historical data is only available for year 2022+.');
    } else {
      const redisKey = getHistoryRedisKey(env, year);
      const expireAt = getNextSnapshotDate();
      const history = await redis.cacheFetchJson(redisKey, () => fetchHistory(env, year), {
        cacheExpiryType: CacheExpiryType.ExpireAtDate,
        cacheExpireAt: expireAt,
      });
      await sendWithCacheControl(redisKey, response, history);
    }
  }
);

const fetchHistory = async (env: ENV, year: number) => {
  const metricsSnapshots = await getMetricsHistory(env, year);
  return metricsToHistory(metricsSnapshots, year);
};

const metricsToHistory = (metrics: MetricsSnapshot[], year: number) => {
  const response: HistoryResponse = {
    startDate: new Date(year, 0, 1).valueOf(),
    endDate: new Date(year, 11, 31).valueOf(),
    borrowersHistory: [],
    hbbHoldersHistory: [],
    hbbPriceHistory: [],
    hbbSupplyHistory: [],
    loansHistory: [],
    usdhHistory: [],
  };
  for (const snapshot of metrics) {
    response.borrowersHistory.push({
      epoch: snapshot.createdOn,
      value: new Decimal(snapshot.metrics.borrowing.numberOfBorrowers),
    });
    response.loansHistory.push({
      epoch: snapshot.createdOn,
      value: new Decimal(snapshot.metrics.borrowing.loans.total),
    });
    response.usdhHistory.push({
      epoch: snapshot.createdOn,
      value: new Decimal(snapshot.metrics.usdh.issued),
    });
    response.hbbPriceHistory.push({
      epoch: snapshot.createdOn,
      value: new Decimal(snapshot.metrics.hbb.price),
    });
    response.hbbHoldersHistory.push({
      epoch: snapshot.createdOn,
      value: new Decimal(snapshot.metrics.hbb.numberOfHolders),
    });
    response.hbbSupplyHistory.push({
      epoch: snapshot.createdOn,
      value: new Decimal(snapshot.metrics.hbb.issued),
    });
  }
  return response;
};

export default historyRoute;
