import { internalError, sendWithCacheControl } from '../utils/apiUtils';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { BorrowingVersionResponse } from '../models/api/BorrowingVersionResponse';
import { ENV } from '../services/web3/client';
import { getBorrowingVersionParameterName } from '../constants/hubble';
import { getParameter } from '../utils/awsUtils';
import { getAwsEnvironmentVariables } from '../services/environmentService';
import logger from '../services/logger';
import redis, { CacheExpiryType } from '../services/redis/redis';
import { BORROWING_VERSION_EXPIRY_IN_SECONDS } from '../constants/redis';
import { middleware } from './middleware/middleware';

const awsEnv = getAwsEnvironmentVariables();

/**
 * Get current borrowing market state version
 */
const borrowingVersionRoute = Router();
borrowingVersionRoute.get(
  '/',
  middleware.validateSolanaCluster,
  async (request: Request<never, string | BorrowingVersionResponse, never, EnvironmentQueryParams>, response) => {
    const env: ENV = request.query.env ?? 'mainnet-beta';
    const parameterName = getBorrowingVersionParameterName(env);
    try {
      const borrowingVersion = await getBorrowingVersion(env, parameterName);
      await sendWithCacheControl(parameterName, response, borrowingVersion);
    } catch (e) {
      logger.error(e);
      response.status(internalError).send('Could not get borrowing version');
    }
  }
);

export default borrowingVersionRoute;

export async function getBorrowingVersion(env: ENV, parameterName: string): Promise<BorrowingVersionResponse> {
  const version = await redis.cacheFetch(parameterName, () => fetchBorrowingVersion(parameterName), {
    cacheExpirySeconds: BORROWING_VERSION_EXPIRY_IN_SECONDS,
    cacheExpiryType: CacheExpiryType.ExpireInSeconds,
  });
  return { version: parseInt(version) };
}

export async function fetchBorrowingVersion(parameterName: string): Promise<string> {
  const parameter = await getParameter(
    parameterName,
    awsEnv.AWS_ACCESS_KEY_ID,
    awsEnv.AWS_SECRET_ACCESS_KEY,
    awsEnv.AWS_REGION
  );
  const borrowingVersionValue = parameter.Parameter?.Value;
  if (borrowingVersionValue) {
    const borrowingVersion = parseInt(borrowingVersionValue);
    if (isNaN(borrowingVersion)) {
      throw Error(
        `Could not parse borrowing version value from AWS for parameter: ${parameterName} (has to be number). Current value: ${borrowingVersionValue}`
      );
    }
    return borrowingVersionValue;
  }
  throw Error(`No borrowing version value returned from AWS for parameter: ${parameterName}`);
}
