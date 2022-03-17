import Router from 'express-promise-router';
import { Request } from 'express';
import { getEnvOrThrow } from '../utils/envUtils';
import { getRedisEnvironmentVariables } from '../services/environmentService';
import { badGateway } from '../utils/apiUtils';
import logger from '../services/logger';
import getRedisClient from '../services/redis';

const version = getEnvOrThrow('API_VERSION');
const redisEnv = getRedisEnvironmentVariables();
const redisUrl = `http://${redisEnv.REDIS_HOST}:${redisEnv.REDIS_PORT}`;

/**
 * API Health check and check connection to Redis
 */
const healthRoute = Router();
healthRoute.get('/', async (request: Request<never, string, never, never>, response) => {
  const redis = await getRedisClient(redisEnv.REDIS_HOST, redisEnv.REDIS_PORT);
  redis
    .ping()
    .then(() => response.send(version))
    .catch((e) => {
      const err = `could not ping redis ${redisUrl}`;
      logger.warn(err, e);
      response.status(badGateway).send(err);
    });
});

export default healthRoute;
