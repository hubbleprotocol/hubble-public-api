import { badGateway, internalError } from '../utils/apiUtils';
import Router from 'express-promise-router';
import { Request } from 'express';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { BorrowingVersionResponse } from '../models/api/BorrowingVersionResponse';
import { ENV } from '../services/web3/client';
import { getBorrowingVersionParameterName } from '../constants/hubble';
import { getParameter } from '../utils/awsUtils';
import { getAwsEnvironmentVariables } from '../services/environmentService';
import logger from '../services/logger';
import redis from '../services/redis/redis';
import { BORROWING_VERSION_EXPIRY_IN_SECONDS } from '../constants/redis';

const awsEnv = getAwsEnvironmentVariables();

/**
 * Get current borrowing market state version
 */
const borrowingVersionRoute = Router();
borrowingVersionRoute.get(
  '/',
  async (request: Request<never, string | BorrowingVersionResponse, never, EnvironmentQueryParams>, response) => {
    let env: ENV = 'mainnet-beta';
    if (request.query.env) {
      env = request.query.env;
    }

    const parameterName = getBorrowingVersionParameterName(env);
    const cached = await redis.getAndParseKey<BorrowingVersionResponse>(parameterName);
    if (cached) {
      response.send(cached);
      return;
    }
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
        const err = `Could not parse borrowing version value from AWS (has to be number): ${borrowingVersionValue}`;
        logger.error(err);
        response.status(internalError).send(err);
        return;
      }
      const res = { version: borrowingVersion };
      response.send(res);
      await redis.saveAsJsonWithExpiry(parameterName, res, BORROWING_VERSION_EXPIRY_IN_SECONDS);
    } else {
      const err = 'Could not get borrowing version value from AWS';
      logger.error(err);
      response.status(badGateway).send(err);
    }
  }
);

export default borrowingVersionRoute;
