import { badRequest, internalError, ok } from '../utils/apiUtils';
import { ENV } from '../services/web3/client';
import { getAwsEnvironmentVariables, getRedisEnvironmentVariables } from '../services/environmentService';
import { MetricsSnapshot } from '../models/api/MetricsSnapshot';
import { HistoryResponse } from '../models/api/HistoryResponse';
import { getDynamoDb } from '../utils/awsUtils';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import Router from 'express-promise-router';
import { Request } from 'express';
import Decimal from 'decimal.js';
import logger from '../services/logger';
import RedisProvider from '../services/redis/redis';
import { dateToUnixSeconds } from '../utils/calculations';

const awsEnv = getAwsEnvironmentVariables();
const dynamoDb = getDynamoDb(awsEnv.AWS_ACCESS_KEY_ID, awsEnv.AWS_SECRET_ACCESS_KEY, awsEnv.AWS_REGION);

const redisEnv = getRedisEnvironmentVariables();
const redisUrl = `http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`;

/**
 * Get Hubble on-chain historical metrics
 */
const historyRoute = Router();
export type HistoryQueryParams = {
  env: ENV | undefined;
  from: string | undefined;
  to: string | undefined;
};
historyRoute.get('/', async (request: Request<never, string, never, HistoryQueryParams>, response) => {
  let env: ENV = request.query.env ?? 'mainnet-beta';
  let from = new Date();
  from.setMonth(from.getMonth() - 1); //by default only return historical data for the past month
  let fromEpoch: number = request.query.from ? +request.query.from : from.valueOf();
  let toEpoch: number = request.query.to ? +request.query.to : new Date().valueOf();
  if (fromEpoch > toEpoch) {
    response
      .status(badRequest)
      .send(`Start date (epoch: ${fromEpoch}) can not be bigger than end date (epoch: ${toEpoch})`);
  } else {
    const res = await getHistory(env, fromEpoch, toEpoch);
    response.status(res.status).send(res.body);
  }
});

async function saveHistoryMetricsToCache(env: ENV, redisClient: RedisProvider) {
  logger.info({ message: 'saving all history metrics to cache', env });
  // load up 1 year of history to cache
  const fromEpoch = new Date();
  fromEpoch.setFullYear(fromEpoch.getFullYear() - 1);
  const params: DocumentClient.QueryInput = {
    TableName: awsEnv.COIN_STATS_TABLE,
    KeyConditionExpression: '#env = :envValue and createdOn >= :fromEpoch',
    ExpressionAttributeNames: { '#env': 'environment' }, //environment is a dynamodb reserved word, so we replace it with #env
    ExpressionAttributeValues: { ':envValue': env, ':fromEpoch': fromEpoch.valueOf() },
  };
  const queryResults = await getQueryResults(params);
  await setHistoryMetrics(queryResults, env, redisClient);
  return queryResults;
}

async function getCachedHistoryMetrics(env: ENV, redisProvider: RedisProvider) {
  const history = await redisProvider.client.get(`history-${env}`);
  if (history) {
    return JSON.parse(history) as MetricsSnapshot[];
  }
  return undefined;
}

async function setHistoryMetrics(metrics: MetricsSnapshot[], env: ENV, redisProvider: RedisProvider) {
  // expire the metrics cache on the first minute of the next hour, we only keep hourly snapshots of history in dynamodb and refresh once per hour
  // for example, we save to cache at 10:15, hourly snapshot is saved to dynamodb at 11:00, we need to refresh the cache at 11:01
  const expireAt = new Date();
  expireAt.setHours(expireAt.getHours() + 1);
  expireAt.setMinutes(1);
  expireAt.setSeconds(0);

  const key = `history-${env}`;

  logger.info({ message: 'cache history metrics in redis', key, expireAt, redisUrl });

  return redisProvider.saveWithExpireAt(key, metrics, dateToUnixSeconds(expireAt));
}

async function getQueryResults(params: DocumentClient.QueryInput) {
  const results = [];
  do {
    const queryResults = await dynamoDb.query(params).promise();
    if (queryResults?.Items) {
      for (const key of queryResults.Items) {
        const snapshot = key as MetricsSnapshot;
        results.push(snapshot);
      }
    } else {
      logger.error(`could not get history from AWS ${history}`);
      throw Error('Could not get history data from AWS');
    }
    params.ExclusiveStartKey = queryResults.LastEvaluatedKey;
  } while (params.ExclusiveStartKey !== undefined);
  return results;
}

export async function getHistory(
  env: ENV,
  fromEpoch: number,
  toEpoch: number
): Promise<{ status: number; body: any; metrics: MetricsSnapshot[] }> {
  try {
    const redis = RedisProvider.getInstance();
    let cachedMetrics = await getCachedHistoryMetrics(env, redis);
    if (!cachedMetrics) {
      cachedMetrics = await saveHistoryMetricsToCache(env, redis);
    }

    const filteredMetrics = cachedMetrics.filter((x) => x.createdOn >= fromEpoch && x.createdOn <= toEpoch);

    // 3. every hour at 00 minutes we schedule with cron expression and call the metrics function and save it alongside existing redis cache by appending it to the history and updating endDate

    return { status: ok, body: metricsToHistory(filteredMetrics, fromEpoch, toEpoch), metrics: filteredMetrics };
  } catch (e) {
    logger.error(e);
    return { status: internalError, body: e instanceof Error ? e.message : e, metrics: [] };
  }
}

const metricsToHistory = (metrics: MetricsSnapshot[], fromEpoch: number, toEpoch: number) => {
  const response: HistoryResponse = {
    startDate: fromEpoch,
    endDate: toEpoch,
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
