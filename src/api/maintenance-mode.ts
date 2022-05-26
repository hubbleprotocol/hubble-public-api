import { internalError } from '../utils/apiUtils';
import { ENV } from '../services/web3/client';
import { getParameter } from '../utils/awsUtils';
import { getMaintenanceModeParameterName } from '../constants/hubble';
import { getAwsEnvironmentVariables } from '../services/environmentService';
import EnvironmentQueryParams from '../models/api/EnvironmentQueryParams';
import { MaintenanceModeResponse } from '../models/api/MaintenanceModeResponse';
import { Request } from 'express';
import Router from 'express-promise-router';
import logger from '../services/logger';
import redis from '../services/redis/redis';
import { MAINTENANCE_MODE_EXPIRY_IN_SECONDS } from '../constants/redis';

const awsEnv = getAwsEnvironmentVariables();

/**
 * Get Hubble maintenance mode status
 */
const maintenanceModeRoute = Router();
maintenanceModeRoute.get(
  '/',
  async (request: Request<never, MaintenanceModeResponse | string, never, EnvironmentQueryParams>, response) => {
    const env: ENV = request.query.env ?? 'mainnet-beta';
    try {
      const maintenanceMode = await getMaintenanceMode(env);
      response.send(maintenanceMode);
    } catch (e) {
      logger.error(e);
      response.status(internalError).send('Could not get maintenance mode');
    }
  }
);

export default maintenanceModeRoute;

export async function getMaintenanceMode(env: ENV): Promise<MaintenanceModeResponse> {
  const parameterName = getMaintenanceModeParameterName(env);
  const maintenanceModeNumber = await redis.cacheFetch(parameterName, () => fetchMaintenanceMode(parameterName), { cacheExpirySeconds: MAINTENANCE_MODE_EXPIRY_IN_SECONDS });
  return { enabled: maintenanceModeNumber > 0 }
}

export async function fetchMaintenanceMode(parameterName: string): Promise<number> {
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
      throw Error(`Could not parse maintenance mode value from AWS for parameter: ${parameterName} (has to be number). Current value: ${maintenanceParameterValue}`);
    }
    return maintenanceModeNumber;
  }
  throw Error(`No maintenance mode value returned from AWS for parameter: ${parameterName}`);
}
