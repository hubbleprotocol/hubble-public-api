import { badGateway, internalError } from '../utils/apiUtils';
import { ENV } from '../services/web3/client';
import { getParameter } from '../utils/awsUtils';
import { getMaintenanceModeParameterName } from '../constants/hubble';
import { getAwsEnvironmentVariables } from '../services/environmentService';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { MaintenanceModeResponse } from '../models/api/MaintenanceModeResponse';
import { Request } from 'express';
import Router from 'express-promise-router';
import logger from '../services/logger';
import RedisProvider from '../services/redis/redis';

const awsEnv = getAwsEnvironmentVariables();

/**
 * Get Hubble maintenance mode status
 */
const maintenanceModeRoute = Router();
maintenanceModeRoute.get(
  '/',
  async (request: Request<never, MaintenanceModeResponse | string, never, EnvironmentQueryParams>, response) => {
    let env: ENV = 'mainnet-beta';
    if (request.query.env) {
      env = request.query.env;
    }
    const parameterName = getMaintenanceModeParameterName(env);
    const redis = RedisProvider.getInstance();
    const cached = await redis.getAndParseKey<MaintenanceModeResponse>(parameterName);
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
    const maintenanceParameterValue = parameter.Parameter?.Value;
    if (maintenanceParameterValue) {
      const maintenanceModeNumber = parseInt(maintenanceParameterValue);
      if (isNaN(maintenanceModeNumber)) {
        const err = `Could not parse maintenance mode value from AWS (has to be number): ${maintenanceParameterValue}`;
        logger.error(err);
        response.status(internalError).send(err);
        return;
      }
      const res = { enabled: maintenanceModeNumber > 0 };
      response.send(res);
      await redis.saveWithExpiry(parameterName, res, 60);
    } else {
      const err = 'Could not get maintenance mode value from AWS';
      logger.error(err);
      response.status(badGateway).send(err);
    }
  }
);

export default maintenanceModeRoute;
