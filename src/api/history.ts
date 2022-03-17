import { badRequest, internalError, ok } from '../utils/apiUtils';
import { ENV } from '../services/web3/client';
import { getAwsEnvironmentVariables, getRedisEnvironmentVariables } from '../services/environmentService';
import { MetricsSnapshot } from '../models/api/MetricsSnapshot';
import { HistoryResponse } from '../models/api/HistoryResponse';
import { getDynamoDb } from '../utils/awsUtils';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import Router from 'express-promise-router';
import { Request } from 'express';
import RedisService from '../services/RedisService';
import Decimal from 'decimal.js';
import logger from '../services/logger';

const awsEnv = getAwsEnvironmentVariables();
const dynamoDb = getDynamoDb(awsEnv.AWS_ACCESS_KEY_ID, awsEnv.AWS_SECRET_ACCESS_KEY, awsEnv.AWS_REGION);

const redisEnv = getRedisEnvironmentVariables();
const redisUrl = `http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`;
const redis = new RedisService(redisEnv.REDIS_HOST, redisEnv.REDIS_PORT);
redis
  .connect()
  .then(() => logger.info(`✅ [redis] Connected at ${redisUrl}`))
  .catch((e) => {
    logger.error(`❌ [redis] could not connect at ${redisUrl}`, e);
  });

/**
 * Get Hubble on-chain historical metrics
 */
const historyRoute = Router();
type HistoryQueryParams = {
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

async function saveMetricsToCache(env: ENV) {
  logger.info({ message: 'saving all metrics to cache', env });
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
  await redis.setMetrics(queryResults, env);
  return queryResults;
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

async function getHistory(env: ENV, fromEpoch: number, toEpoch: number): Promise<{ status: number; body: any }> {
  try {
    let cachedMetrics = await redis.getMetrics(env);
    if (!cachedMetrics) {
      cachedMetrics = await saveMetricsToCache(env);
    }

    const filteredMetrics = cachedMetrics.filter((x) => x.createdOn >= fromEpoch && x.createdOn <= toEpoch);

    // 3. every hour at 00 minutes we schedule with cron expression and call the metrics function and save it alongside existing redis cache by appending it to the history and updating endDate

    return { status: ok, body: metricsToHistory(filteredMetrics, fromEpoch, toEpoch) };
  } catch (e) {
    logger.error(e);
    return { status: internalError, body: e instanceof Error ? e.message : e };
  }
}

const metricsToHistory = (metrics: MetricsSnapshot[], fromEpoch: number, toEpoch: number) => {
  const response: HistoryResponse = {
    startDate: fromEpoch,
    endDate: toEpoch,
    borrowersHistory: [],
    hbbHoldersHistory: [],
    hbbPriceHistory: [],
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
  }
  return response;
};

export default historyRoute;
